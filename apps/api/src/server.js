// apps/api/src/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Cargar variables (.env.local en dev; .env en prod/local)
const envLocal = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: fs.existsSync(envLocal) ? envLocal : path.join(__dirname, '..', '.env') });

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) app.use(morgan('dev'));
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));
app.use(express.json());

// --- DB (Neon/Postgres) ---
const hasDb = Boolean(process.env.DATABASE_URL);
let pool = null;
if (hasDb) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// --- CORS ---
const ALLOW_VERCEL_WILDCARD = process.env.ALLOW_VERCEL_WILDCARD === 'true';
const allowList = (process.env.STORE_CORS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const vercelRe = /\.vercel\.app$/i;
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowList.includes('*') || allowList.includes(origin)) return true;
  if (ALLOW_VERCEL_WILDCARD) {
    try {
      const host = new URL(origin).host;
      if (vercelRe.test(host)) return true;
    } catch {}
  }
  return false;
}
app.use(cors({
  origin(origin, cb) { isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin ?? 'no-origin'}`)); },
  credentials: false,
}));

// --- Products (seed fallback) ---
const productsFile = path.join(__dirname, '..', 'seed', 'products.json');
let seedProducts = [];
try { seedProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8')); }
catch { console.warn('Seed products no encontrados o JSON inválido.'); }

// --- API key sencilla (para endpoints sensibles) ---
const API_KEY = process.env.API_KEY; // DEBE estar en Render
function requireApiKey(req, res, next) {
  if (!API_KEY) return res.status(501).json({ error: 'API disabled' });
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ------------ Helpers ÓRDENES ------------
const ALLOWED_STATUSES = new Set(['pending', 'paid', 'failed', 'canceled', 'refunded']);

/** Normaliza/valida status desconocidos */
function normStatus(s, fallback = 'pending') {
  if (!s) return fallback;
  const v = String(s).toLowerCase();
  return ALLOWED_STATUSES.has(v) ? v : fallback;
}

/** Actualiza una orden con campos sueltos */
async function updateOrder(id, fields) {
  if (!hasDb) return;
  if (!id || !fields || !Object.keys(fields).length) return;

  const cols = [];
  const vals = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    cols.push(`${k} = $${i++}`);
    vals.push(v);
  }
  vals.push(id);
  const sql = `update orders set ${cols.join(', ')} where id = $${i}`;
  await pool.query(sql, vals);
}

/** Extrae {id, status} de un webhook por proveedor (placeholder simple). */
function parseWebhook(provider, body = {}) {
  // Aquí irán las extracciones reales de cada gateway.
  // Por ahora intentamos varias claves comunes y ponemos defaults.
  const id =
    body.orderId ||
    body.referenceCode ||
    body.reference ||
    body.merchant_order_id ||
    body.id ||
    null;

  // Mapeos muy básicos de ejemplo:
  let status = body.status || body.state || body.state_pol || body.transaction_status || 'paid';
  status = normStatus(status, 'paid');

  return { id, status, provider };
}

// ------------ RUTAS BÁSICAS ------------
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.get('/db/ping', async (_req, res) => {
  if (!hasDb) return res.status(400).json({ ok: false, error: 'DATABASE_URL not set' });
  try {
    const { rows } = await pool.query('select 1 as ok');
    return res.json({ ok: rows[0].ok === 1 });
  } catch (err) {
    console.error('[db/ping] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/products', async (_req, res) => {
  if (hasDb) {
    try {
      const { rows } = await pool.query(
        'select id, title, description, price, currency_code, image from products order by title'
      );
      return res.json(rows);
    } catch (err) {
      console.error('[GET /products] DB error -> fallback JSON:', err.message);
    }
  }
  return res.json(seedProducts);
});

app.get('/products/:id', async (req, res) => {
  if (hasDb) {
    try {
      const { rows } = await pool.query(
        'select id, title, description, price, currency_code, image from products where id=$1 limit 1',
        [req.params.id]
      );
      if (rows.length) return res.json(rows[0]);
    } catch (err) {
      console.error('[GET /products/:id] DB error -> fallback:', err.message);
    }
  }
  const p = seedProducts.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
  return res.json(p);
});

// ------------ ÓRDENES ---------------

// POST /orders  (crea orden; requiere API key)
app.post('/orders', requireApiKey, async (req, res) => {
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const id = `order_${Date.now()}`;
  const items = payload.items ?? [];
  const amount = Number(payload.amount ?? 0);
  const currency = (payload.currency ?? 'COP').toUpperCase();
  const provider = payload.provider ?? null;
  const status = 'pending';

  console.log('Nueva orden recibida:', { id, items, amount, currency });

  if (hasDb) {
    try {
      await pool.query(
        `insert into orders (id, items, amount, currency_code, status, provider)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do nothing`,
        [id, JSON.stringify(items), amount, currency, status, provider]
      );
    } catch (e) {
      console.error('[POST /orders] insert error:', e);
    }
  }

  return res.status(201).json({ id, status });
});

// GET /orders/:id  (consulta en DB si existe)
app.get('/orders/:id', async (req, res) => {
  const id = req.params.id;
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });

  try {
    const { rows } = await pool.query(
      'select id, items, amount, currency_code, status, provider, created_at from orders where id=$1 limit 1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('[GET /orders/:id] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// GET /orders?limit=20  (listado admin; requiere x-api-key)
app.get('/orders', requireApiKey, async (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 20)));
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });

  try {
    const { rows } = await pool.query(
      `select id, amount, currency_code, status, provider, created_at
       from orders
       order by created_at desc
       limit $1`,
      [limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error('[GET /orders] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// ------------ WEBHOOKS (placeholders útiles) ------------
// IMPORTANTE: aquí todavía no verificamos firmas; eso se añade
// al integrar la pasarela real. Por ahora sirven para actualizar estado.

app.post('/payments/payu/webhook', async (req, res) => {
  try {
    const { id, status, provider } = parseWebhook('payu', req.body);
    if (!id) return res.status(400).send('missing order id');
    await updateOrder(id, { status, provider });
    return res.status(200).send('OK');
  } catch (e) {
    console.error('[payu webhook] error:', e);
    return res.status(500).send('ERR');
  }
});

app.post('/payments/paypal/webhook', async (req, res) => {
  try {
    const { id, status, provider } = parseWebhook('paypal', req.body);
    if (!id) return res.status(400).send('missing order id');
    await updateOrder(id, { status, provider });
    return res.status(200).send('OK');
  } catch (e) {
    console.error('[paypal webhook] error:', e);
    return res.status(500).send('ERR');
  }
});

app.post('/payments/bitpay/webhook', async (req, res) => {
  try {
    const { id, status, provider } = parseWebhook('bitpay', req.body);
    if (!id) return res.status(400).send('missing order id');
    await updateOrder(id, { status, provider });
    return res.status(200).send('OK');
  } catch (e) {
    console.error('[bitpay webhook] error:', e);
    return res.status(500).send('ERR');
  }
});

// -------------------------------------
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, () => {
  console.log(`Servidor API Alican-teca escuchando en puerto ${PORT}`);
  console.log(`CORS allowList: ${allowList.join(', ') || '(empty)'}; ALLOW_VERCEL_WILDCARD=${ALLOW_VERCEL_WILDCARD}`);
});
