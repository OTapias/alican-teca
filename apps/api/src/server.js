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

// Middlewares base
if (!isProd) app.use(morgan('dev'));
app.set('trust proxy', 1); // Render/Heroku proxy
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));
app.use(express.json());

// --- DB (Neon/Postgres) ---
const hasDb = Boolean(process.env.DATABASE_URL);
let pool = null;
if (hasDb) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // necesario en Neon gestionado
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
  if (!origin) return true;                               // curl / servidores sin Origin
  if (allowList.includes('*') || allowList.includes(origin)) return true;
  if (ALLOW_VERCEL_WILDCARD) {
    try {
      const host = new URL(origin).host;
      if (vercelRe.test(host)) return true;
    } catch {}
  }
  return false;
}
app.use(
  cors({
    origin(origin, cb) {
      isAllowedOrigin(origin) ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin ?? 'no-origin'}`));
    },
    credentials: false, // mantenlo en false mientras no uses cookies
  })
);

// --- Products (seed fallback) ---
const productsFile = path.join(__dirname, '..', 'seed', 'products.json');
let seedProducts = [];
try {
  seedProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
} catch {
  console.warn('Seed products no encontrados o JSON inválido.');
}

// --- API key sencilla (para endpoints sensibles) ---
const API_KEY = process.env.API_KEY; // DEBE estar en Render (y en local si llamas a la API local)
function requireApiKey(req, res, next) {
  if (!API_KEY) return res.status(501).json({ error: 'API disabled' });
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ------------ RUTAS BÁSICAS ------------
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

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
  const currency = String(payload.currency ?? 'COP').toUpperCase();
  const provider = payload.provider ?? null;
  const status = 'pending';

  console.log('Nueva orden recibida:', { id, items, amount, currency });

  if (hasDb) {
    try {
      await pool.query(
        `insert into orders (id, items, amount, currency_code, status, provider)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           items=excluded.items,
           amount=excluded.amount,
           currency_code=excluded.currency_code,
           status=excluded.status,
           provider=excluded.provider`,
        [id, JSON.stringify(items), amount, currency, status, provider]
      );
    } catch (e) {
      console.error('[POST /orders] insert error:', e);
      // No bloqueamos la respuesta al front si falla la inserción; la orden igual se devuelve.
    }
  }

  return res.status(201).json({ id, status });
});

// GET /orders/:id  (consulta en DB si existe)
app.get('/orders/:id', async (req, res) => {
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });

  try {
    const { rows } = await pool.query(
      `select id, items, amount, currency_code, status, provider, created_at
       from orders where id=$1 limit 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });

    const row = rows[0];
    // items se guardó como texto JSON: conviértelo a objeto para mostrarlo mejor
    if (row.items && typeof row.items === 'string') {
      try { row.items = JSON.parse(row.items); } catch {}
    }

    return res.json(row);
  } catch (e) {
    console.error('[GET /orders/:id] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// GET /orders (admin: listado) — protegido con API key
app.get('/orders', requireApiKey, async (req, res) => {
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });
  const limit = Math.min(Number(req.query.limit || 20), 200);
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

// ------------ Webhooks (placeholders para pruebas) ------------
app.post('/payments/payu/webhook', (req, res) => {
  console.log('PayU webhook:', req.body);
  res.status(200).send('OK');
});
app.post('/payments/paypal/webhook', (req, res) => {
  console.log('PayPal webhook:', req.body);
  res.status(200).send('OK');
});
app.post('/payments/bitpay/webhook', (req, res) => {
  console.log('BitPay webhook:', req.body);
  res.status(200).send('OK');
});

// -------------------------------------
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, () => {
  console.log(`Servidor API Alican-teca escuchando en puerto ${PORT}`);
  console.log(`CORS allowList: ${allowList.join(', ') || '(empty)'}; ALLOW_VERCEL_WILDCARD=${ALLOW_VERCEL_WILDCARD}`);
});
