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
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json());

// --- DB (Neon/Postgres) opcional ---
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
  .map((s) => s.trim())
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
app.use(
  cors({
    origin(origin, cb) {
      isAllowedOrigin(origin)
        ? cb(null, true)
        : cb(new Error(`Not allowed by CORS: ${origin ?? 'no-origin'}`));
    },
    credentials: false,
  })
);

// --- Seeds de productos como fallback ---
const productsFile = path.join(__dirname, '..', 'seed', 'products.json');
let seedProducts = [];
try {
  seedProducts = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
} catch {
  console.warn('Seed products no encontrados o JSON inválido.');
}

// --- API key sencilla (para endpoints sensibles) ---
const API_KEY = process.env.API_KEY; // defínela en Render
function requireApiKey(req, res, next) {
  if (!API_KEY) return res.status(501).json({ error: 'API disabled' });
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// =====================
//      PAYPAL
// =====================
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'; // 'sandbox' | 'live'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_CURRENCY_OVERRIDE = (process.env.PAYPAL_CURRENCY_OVERRIDE || '').toUpperCase(); // opcional
const paypalBase =
  PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function paypalAccessToken() {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`[paypalAccessToken] ${r.status}`);
  const j = await r.json();
  return j.access_token;
}

// =====================
//      RUTAS
// =====================

// Salud
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// DB ping
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

// Productos
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
  const p = seedProducts.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
  return res.json(p);
});

// ---------------------
//        ÓRDENES
// ---------------------

// Crea orden local (backend privado; tu Next la invoca con x-api-key desde /api/create-order)
app.post('/orders', requireApiKey, async (req, res) => {
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
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

// Consulta orden pública (por id)
app.get('/orders/:id', async (req, res) => {
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });
  try {
    const { rows } = await pool.query(
      'select id, items, amount, currency_code, status, provider, created_at from orders where id=$1 limit 1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('[GET /orders/:id] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// Listado admin
app.get('/orders', requireApiKey, async (req, res) => {
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));
  try {
    const { rows } = await pool.query(
      `select id, amount, currency_code, status, provider, created_at 
       from orders order by created_at desc limit $1`,
      [limit]
    );
    return res.json(rows);
  } catch (e) {
    console.error('[GET /orders] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// Actualiza estado (admin)
app.patch('/orders/:id', requireApiKey, async (req, res) => {
  if (!hasDb) return res.status(501).json({ error: 'DB not configured' });
  const id = req.params.id;
  const { status, provider } = req.body || {};
  try {
    const { rowCount } = await pool.query(
      `update orders set 
          status = coalesce($2, status),
          provider = coalesce($3, provider)
        where id=$1`,
      [id, status, provider]
    );
    if (!rowCount) return res.status(404).json({ error: 'Order not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /orders/:id] error:', e);
    return res.status(500).json({ error: 'DB error' });
  }
});

// ---------------------
//     PAYMENTS: PayPal
// ---------------------

// Crea orden en PayPal y devuelve la URL de aprobación
// body: { local_order_id, amount, currency, return_url, cancel_url }
app.post('/payments/paypal/create-order', async (req, res) => {
  try {
    const { local_order_id, amount, currency, return_url, cancel_url } = req.body || {};
    if (!local_order_id || !amount) {
      return res.status(400).json({ error: 'Missing local_order_id or amount' });
    }

    const currencyToUse =
      PAYPAL_CURRENCY_OVERRIDE || (currency || 'USD').toUpperCase();

    const token = await paypalAccessToken();

    // IMPORTANTE: asumimos que "amount" llega en unidades (no centavos).
    // Si tuvieras centavos, usar: const value = (Number(amount) / 100).toFixed(2)
    const value = Number(amount).toFixed(2);

    const r = await fetch(`${paypalBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: currencyToUse, value },
            custom_id: local_order_id, // para atar el webhook a tu orden local
          },
        ],
        application_context: {
          return_url,
          cancel_url,
        },
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('[paypal create-order] error:', data);
      return res.status(400).json({ error: 'paypal_create_order_failed', details: data });
    }

    const approve = (data.links || []).find((l) => l.rel === 'approve');
    return res.json({ paypal_order_id: data.id, approveUrl: approve?.href || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Webhook PayPal: captura y actualiza la orden local
app.post('/payments/paypal/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Nota: en producción deberías validar la firma con VERIFY_WEBHOOK_SIGNATURE.
    // Aquí nos centramos en el flujo.

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const paypalOrderId = event.resource?.id;
      const localId = event.resource?.purchase_units?.[0]?.custom_id;

      const token = await paypalAccessToken();
      const r = await fetch(`${paypalBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const capture = await r.json();

      if (r.ok) {
        if (hasDb && localId) {
          try {
            await pool.query(
              "update orders set status='paid', provider='paypal' where id=$1",
              [localId]
            );
          } catch (dbErr) {
            console.error('[webhook] DB update error:', dbErr);
          }
        }
      } else {
        console.error('[paypal capture error]', capture);
        if (hasDb && localId) {
          await pool.query(
            "update orders set status='failed', provider='paypal' where id=$1",
            [localId]
          );
        }
      }
    }

    if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const localId =
        event.resource?.custom_id ||
        event.resource?.supplementary_data?.related_ids?.order_id;
      if (hasDb && localId) {
        await pool.query(
          "update orders set status='failed', provider='paypal' where id=$1",
          [localId]
        );
      }
    }

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const localId = event.resource?.custom_id;
      if (hasDb && localId) {
        await pool.query(
          "update orders set status='paid', provider='paypal' where id=$1",
          [localId]
        );
      }
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('[paypal webhook] error:', e);
    // devolver 200 para que PayPal no reintente indefinidamente
    return res.status(200).send('OK');
  }
});

// Otros webhooks (placeholders)
app.post('/payments/payu/webhook', (req, res) => {
  console.log('PayU webhook:', req.body);
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
  console.log(
    `CORS allowList: ${allowList.join(', ') || '(empty)'}; ALLOW_VERCEL_WILDCARD=${ALLOW_VERCEL_WILDCARD}`
  );
});
