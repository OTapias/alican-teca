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

// Cargar variables de entorno (.env.local en dev, .env en prod/local)
const envLocal = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: fs.existsSync(envLocal) ? envLocal : path.join(__dirname, '..', '.env') });

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Logs (solo en dev para no llenar los logs de Render)
if (!isProd) app.use(morgan('dev'));

// Seguridad base
app.set('trust proxy', 1); // Render/Heroku proxy
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limit básico (60 req/min por IP)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));

// --- DB (Neon/Postgres) ---
const hasDb = Boolean(process.env.DATABASE_URL);
let pool = null;
if (hasDb) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // necesario con Neon gestionado
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
  if (!origin) return true; // curl / servidores sin cabecera Origin
  if (allowList.includes('*') || allowList.includes(origin)) return true;

  if (ALLOW_VERCEL_WILDCARD) {
    try {
      const host = new URL(origin).host;
      if (vercelRe.test(host)) return true;
    } catch {
      // Origin inválido -> denegar
    }
  }
  return false;
}

app.use(cors({
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin ?? 'no-origin'}`));
  },
  credentials: false, // mantenlo en false mientras no uses cookies
}));

app.use(express.json());

// --- Seeds como fallback ---
const productsFile = path.join(__dirname, '..', 'seed', 'products.json');
let seedProducts = [];
try {
  seedProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
} catch {
  console.warn('Seed products no encontrados o JSON inválido.');
}

// --- Auth sencilla por API key (para endpoints sensibles) ---
const API_KEY = process.env.API_KEY; // defínela en Render
function requireApiKey(req, res, next) {
  if (!API_KEY) return res.status(501).json({ error: 'API disabled' });
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// --- Rutas ---
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.get('/db/ping', async (req, res) => {
  if (!hasDb) return res.status(400).json({ ok: false, error: 'DATABASE_URL not set' });
  try {
    const { rows } = await pool.query('select 1 as ok');
    return res.json({ ok: rows[0].ok === 1 });
  } catch (err) {
    console.error('[db/ping] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/products', async (req, res) => {
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

// Endpoint sensible: protegido por API key
app.post('/orders', requireApiKey, (req, res) => {
  const order = req.body;
  const id = `order_${Date.now()}`;
  console.log('Nueva orden recibida:', { id, ...order });
  res.status(201).json({ id, status: 'pending' });
});

// Webhooks (placeholders)
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

// --- Server ---
const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, () => {
  console.log(`Servidor API Alican-teca escuchando en puerto ${PORT}`);
  console.log(`CORS allowList: ${allowList.join(', ') || '(empty)'}, ALLOW_VERCEL_WILDCARD=${ALLOW_VERCEL_WILDCARD}`);
});
