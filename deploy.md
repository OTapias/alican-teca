# Despliegue de Alican‑teca

Este documento describe cómo desplegar el monorepo Alican‑teca en **Vercel** para el frontend y **Neon** (PostgreSQL) para la base de datos, así como cómo poner en producción la API de Medusa.

## 1. Provisionar base de datos en Neon

1. Regístrate o inicia sesión en <https://neon.tech>.
2. Crea un proyecto nuevo con una base de datos PostgreSQL (plan gratuito es suficiente para pruebas).
3. Copia la cadena de conexión `postgres://...` y consérvala.  Debe incluir usuario, contraseña, host, puerto y nombre de la base de datos.
4. Añade un **branch** de desarrollo si deseas separar entornos de staging y producción.

## 2. Configurar Vercel

1. Crea una cuenta en <https://vercel.com> (puedes usar tu cuenta de GitHub para iniciar sesión).
2. Importa el repositorio privado `alican-teca` desde GitHub.
3. Configura los proyectos:
   - **Frontend (`apps/web`)**: selecciona la ruta `apps/web` como carpeta raíz.  Define los siguientes valores en las variables de entorno del proyecto:
     ```env
     NODE_ENV=production
     DATABASE_URL=postgres://<user>:<password>@<host>/<db>
     NEXT_PUBLIC_API_URL=https://api.alican-teca.com
     DOMAIN=alican-teca.com
     ...
     ```
   - **Backend (`apps/api`)**: puedes desplegarlo como un **Serverless Function** en Vercel o como contenedor en una plataforma como Render o Fly.io.  Si eliges Vercel, establece la ruta `apps/api` como raíz y asigna un tiempo de ejecución Node.js.  Añade todas las variables de entorno definidas en `.env.example`.

4. Define un dominio personalizado: añade `alican-teca.com` a tu proyecto en Vercel y actualiza los registros DNS en tu proveedor de dominio para apuntar a los servidores de Vercel.

## 3. Configurar webhooks

* En **PayU**, configura la URL de notificación hacia `https://api.alican-teca.com/payments/payu/webhook`.
* En **PayPal**, añade la URL `https://api.alican-teca.com/payments/paypal/webhook` y copia el ID del webhook generado en la consola de PayPal a las variables de entorno.
* En **BitPay**, registra el webhook `https://api.alican-teca.com/payments/bitpay/webhook` y guarda el secreto en tus variables.

## 4. Semilla de productos y migraciones

1. Tras desplegar la API por primera vez, ejecuta las migraciones de la base de datos (Medusa se encargará de crear las tablas necesarias).  Puedes ejecutar el siguiente comando localmente o desde un workflow de GitHub Actions:

   ```bash
   cd apps/api
   npm run medusa migrations run
   ```

2. Población inicial de productos:
   Carga el archivo [`seed/products.json`](apps/api/seed/products.json) utilizando un script en el backend que cree productos y variantes basados en el esquema de Medusa.  También puedes utilizar el comando `medusa seed` si implementas un script de seed conforme a la documentación oficial.

## 5. Verificación y pruebas

1. Asegúrate de que `https://alican-teca.com` carga el frontend y que las rutas de catálogo y checkout funcionan.
2. Verifica que la API responde en `https://api.alican-teca.com`.
3. Realiza compras de prueba utilizando los modos sandbox de PayU, PayPal y BitPay y revisa que el estado de las órdenes cambia correctamente.

## 6. Consideraciones finales

* Habilita HTTPS para todos los dominios (Vercel se encarga automáticamente si usas sus certificados).
* Configura un servicio de email transaccional (por ejemplo, Mailgun o SendGrid) para enviar confirmaciones de pedidos y notificaciones de envío.
* Monitorea los logs y métricas mediante las herramientas de observabilidad de tu proveedor de alojamiento.
