// Configuración de Medusa para Alican‑teca.  Este archivo se basa en el
// estándar de configuración de Medusa.  Las variables de entorno
// permiten ajustar la conexión a la base de datos y los dominios de CORS.

require('dotenv').config();

module.exports = {
  projectConfig: {
    database_url: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/alican_teca',
    database_type: 'postgres',
    store_cors: process.env.STORE_CORS || '*',
    admin_cors: process.env.ADMIN_CORS || '*',
    jwt_secret: process.env.JWT_SECRET || 'very-secret',
    cookie_secret: process.env.COOKIE_SECRET || 'another-secret'
  },
  plugins: [
    // La pasarela de pagos PayU, PayPal y BitPay se implementará
    // mediante servicios personalizados o plugins disponibles.
  ],
};