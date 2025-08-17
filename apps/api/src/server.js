const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env.local o .env
dotenv.config();

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

// Cargar productos desde el archivo JSON de seeds.  En una implementación real
// se utilizaría la API de Medusa para administrar productos y variantes.
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

// Listado de productos
app.get('/products', (req, res) => {
  res.json(products);
});

// Detalle de un producto
app.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  res.json(product);
});

// Endpoint para crear una orden (simplificado).  En una integración real
// Medusa manejaría carritos, clientes y órdenes.  Aquí sólo se registra
// el payload y devuelve un ID simulado.
app.post('/orders', (req, res) => {
  const order = req.body;
  // Generar identificador ficticio
  const id = `order_${Date.now()}`;
  console.log('Nueva orden recibida:', { id, ...order });
  res.status(201).json({ id, status: 'pending' });
});

// Webhooks de PayU
app.post('/payments/payu/webhook', (req, res) => {
  console.log('Webhook de PayU recibido:', req.body);
  // Aquí actualizarías el estado de la orden en la base de datos según
  // el estado proporcionado por PayU.
  res.status(200).send('OK');
});

// Webhooks de PayPal
app.post('/payments/paypal/webhook', (req, res) => {
  console.log('Webhook de PayPal recibido:', req.body);
  // Validar la firma del webhook utilizando el ID de webhook y el certificado de PayPal.
  res.status(200).send('OK');
});

// Webhooks de BitPay
app.post('/payments/bitpay/webhook', (req, res) => {
  console.log('Webhook de BitPay recibido:', req.body);
  // Validar el HMAC con el secreto configurado en BITPAY_WEBHOOK_SECRET.
  res.status(200).send('OK');
});

// Inicio del servidor
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Servidor API Alican‑teca escuchando en puerto ${PORT}`);
});
