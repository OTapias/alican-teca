# Integraciones de pago en Alican‑teca

Este documento describe los pasos para configurar e integrar los proveedores de pago utilizados en Alican‑teca.  Todos los proveedores se configuran mediante variables de entorno definidas en `.env.local`.

## 1. PayU (tarjetas en Colombia)

PayU se utiliza como procesador de pagos con tarjetas de crédito y débito en Colombia.  La API de PayU admite pagos nacionales e internacionales, múltiples monedas y herramientas de prevención de fraude【297725311043850†L90-L105】.  Para utilizarlo:

1. Crea una cuenta de PayU Colombia en <https://www.payulatam.com/co/> y habilita el modo sandbox.
2. Obtén las siguientes credenciales en el panel de PayU:
   - **API Key**
   - **API Login**
   - **Merchant ID**
   - **Account ID**
3. Configura las variables de entorno correspondientes en `.env.local`:

   ```env
   PAYU_API_KEY=...
   PAYU_API_LOGIN=...
   PAYU_MERCHANT_ID=...
   PAYU_ACCOUNT_ID=...
   PAYU_TEST=true
   PAYU_CALLBACK_URL=https://api.alican-teca.com/payments/payu/webhook
   ```
4. Implementa el webhook `/payments/payu/webhook` en `apps/api/src/server.js` para recibir notificaciones de aprobación, rechazo y devolución de pagos.

### Flujo de cobro

1. El cliente selecciona **Tarjeta (PayU)** en el checkout.
2. La API de Alican‑teca genera un *order* y crea un *transaction request* a PayU.
3. El cliente es redirigido a la página de PayU para ingresar los datos de la tarjeta.
4. PayU procesa el pago y redirige al usuario de vuelta al sitio con el estado de la transacción.
5. PayU envía una notificación al webhook configurado.  La API actualiza el estado de la orden y devuelve una respuesta al frontend.

## 2. PayPal Checkout

PayPal se utiliza como método de pago internacional con opción de “guest checkout”.  El SDK oficial de PayPal permite aceptar tarjetas de débito y crédito sin que el usuario tenga cuenta en PayPal.

1. Crea una cuenta de PayPal Business en <https://developer.paypal.com> y activa el modo sandbox.
2. Obtén los valores **Client ID**, **Client Secret** y **Webhook ID** desde el panel de desarrolladores y complétalos en el archivo `.env.local`:

   ```env
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_WEBHOOK_ID=...
   PAYPAL_ENV=sandbox
   ```
3. En `apps/api/src/server.js` define un endpoint `/payments/paypal/webhook` para recibir los eventos `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED` y `PAYMENT.CAPTURE.DENIED`.

### Flujo de cobro

1. El cliente selecciona **PayPal** en el checkout.
2. La API genera un `order` a través de la API de PayPal y devuelve un `approval_url` al frontend.
3. El cliente es redirigido a PayPal, donde puede pagar con su cuenta o tarjeta (guest checkout).
4. PayPal confirma el pago y redirige al cliente al sitio con el parámetro `token`.
5. La API captura la transacción, actualiza la orden y procesa el webhook correspondiente.

## 3. BitPay (criptomonedas)

BitPay es uno de los procesadores de criptomonedas más consolidados【482864533141430†L281-L307】.  Permite aceptar pagos en BTC, ETH, USDC y USDT, entre muchas otras monedas digitales, y liquidar automáticamente en monedas fiduciarias【875852883076889†L38-L56】.

1. Regístrate en <https://bitpay.com> como empresa y activa la cuenta de pruebas.
2. Crea un token API y registra una clave de webhook.  Añade los valores en `.env.local`:

   ```env
   BITPAY_TOKEN=...
   BITPAY_WEBHOOK_SECRET=...
   ```
3. Configura en el panel de BitPay un webhook apuntando a `https://api.alican-teca.com/payments/bitpay/webhook`.
4. En `apps/api/src/server.js` implementa el endpoint `/payments/bitpay/webhook` para manejar los eventos `invoice_paid`, `invoice_confirmed` y `invoice_failed`.

### Flujo de cobro

1. El cliente selecciona **Criptomonedas (BitPay)** en el checkout y elige la moneda (BTC/ETH/USDC/USDT).
2. La API crea una `invoice` a través de BitPay y devuelve el enlace de pago.
3. El cliente realiza el pago desde su billetera.  BitPay notifica el estado de la factura mediante el webhook.
4. Una vez confirmada la transacción, la orden se marca como pagada y se genera el recibo correspondiente.

## Reembolsos y devoluciones

* **Tarjetas (PayU)**: los reembolsos se tramitan desde el panel de PayU y requieren que el administrador de Alican‑teca autorice la transacción.  Los fondos se devuelven a la tarjeta del cliente en un plazo de 5 a 10 días hábiles, dependiendo del banco.
* **PayPal**: es posible emitir reembolsos parciales o totales a través de la API o desde la consola de PayPal.  Los fondos se reintegran al método de pago original.
* **Criptomonedas**: los reembolsos se realizan transfiriendo la misma criptomoneda a la dirección proporcionada por el cliente.  El monto devuelto se calcula según la tasa de cambio al momento de la compra menos cualquier comisión de red.

## Notas de seguridad

* Nunca almacenes información de tarjetas o claves secretas en el repositorio.  Utiliza variables de entorno y servicios de cofres (por ejemplo, Vercel Environment Variables).
* Asegúrate de que las rutas de webhook sean públicas y seguras (HTTPS) para poder recibir notificaciones de los proveedores de pago.
