// apps/api/src/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env.local o .env
const envLocal = path.join(__dirname, '..', '.env.local');
const envFile = fs.existsSync(envLocal) ? envLocal : path.join(__dirname, '..', '.env');
dotenv.config({ path: envFile });


// --- DB (Neon/Postgres) ---
const { Pool } = require('pg');

// Conexión a Neon si existe DATABASE_URL
const hasDb = !!process.env.DATABASE_URL;
let pool;
if (hasDb) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // necesario con Neon
  });
}

const app = express();

// Habilitar CORS para dominios permitidos definidos en variables de entorno
const allowedOrigins = process.env.STORE_CORS
  ? process.env.STORE_CORS.split(',')
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf('*') !== -1 || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Cargar productos desde el archivo JSON de seeds.
// En una implementación real se utilizaría la API de Medusa o la BD.
const productsFile = path.join(__dirname, '..', 'seed', 'products.json');
let products = [];
try {
  const raw = fs.readFileSync(productsFile, 'utf8');
  products = JSON.parse(raw);
} catch (err) {
  console.warn('No se pudieron cargar los productos de seed:', err.message);
}

// Endpoints básicos
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ping de base de datos (para verificar conexión a Neon)
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

// Listado de productos (desde seed en archivo por ahora)
app.get('/products', async (req, res) => {
  if (hasDb) {
    try {
      const { rows } = await pool.query(
        'SELECT id, title, description, price, currency_code, image FROM products ORDER BY title'
      );
      return res.json(rows);
    } catch (e) {
      console.error('[GET /products] DB error, fallback JSON:', e.message);
    }
  }
  return res.json(products); // fallback
});

// Detalle de un producto
app.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  res.json(product);
});

// Endpoint para crear una orden (simplificado)
app.post('/orders', (req, res) => {
  const order = req.body;
  const id = `order_${Date.now()}`;
  console.log('Nueva orden recibida:', { id, ...order });
  res.status(201).json({ id, status: 'pending' });
});

// Webhooks de PayU
app.post('/payments/payu/webhook', (req, res) => {
  console.log('Webhook de PayU recibido:', req.body);
  // TODO: actualizar estado de orden según notificación de PayU
  res.status(200).send('OK');
});

// Webhooks de PayPal
app.post('/payments/paypal/webhook', (req, res) => {
  console.log('Webhook de PayPal recibido:', req.body);
  // TODO: validar firma del webhook con PAYPAL_WEBHOOK_ID
  res.status(200).send('OK');
});

// Webhooks de BitPay
app.post('/payments/bitpay/webhook', (req, res) => {
  console.log('Webhook de BitPay recibido:', req.body);
  // TODO: validar HMAC con BITPAY_WEBHOOK_SECRET
  res.status(200).send('OK');
});

// Inicio del servidor
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Servidor API Alican-teca escuchando en puerto ${PORT}`);
});
