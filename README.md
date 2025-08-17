# Alican‑teca

**Alican‑teca** es una tienda electrónica premium especializada en artefactos de madera de teca.  Este repositorio contiene un monorepo con dos aplicaciones:

* **`apps/web`** — la interfaz de tienda construida con Next.js 14, TailwindCSS, shadcn/ui y Framer Motion.  Incluye páginas públicas para el catálogo, el carrito y el checkout.
* **`apps/api`** — la API de comercio electrónico basada en Medusa.  Proporciona un sistema de productos, carritos, órdenes y pasarelas de pago (PayU, PayPal y BitPay).  La API expone webhooks para recibir notificaciones de estado de pago.

## Primeros pasos

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/<TU_USUARIO>/alican-teca.git
   cd alican-teca
   ```

2. **Instalar dependencias**

   Este proyecto utiliza workspaces de npm.  Ejecuta la instalación en la raíz del monorepo:

   ```bash
   npm install
   ```

3. **Variables de entorno**

   Copia `.env.example` a `.env.local` y ajusta los valores según tus credenciales de base de datos y proveedores de pago.  Consulta el archivo [`payments.md`](payments.md) para obtener detalles sobre las claves.

4. **Desarrollo local**

   Para levantar simultáneamente el frontend y backend en modo de desarrollo ejecuta:

   ```bash
   npm run dev
   ```

   La aplicación web estará disponible en `http://localhost:3000` y la API en `http://localhost:8000` (puedes modificar los puertos en las variables de entorno).  Ten en cuenta que las dependencias no se instalan dentro de este entorno (por restricciones de red), pero el código está listo para ser instalado en un entorno conectado a Internet.

## Estructura del repositorio

```text
alican‑teca/
├── apps/
│   ├── api/         # API basada en Medusa
│   └── web/         # Frontend Next.js
├── .env.example     # Plantilla de variables de entorno
├── README.md        # Esta guía
├── payments.md      # Documentación de integraciones de pago
├── brand.md         # Identidad visual (paleta y tipografías)
├── deploy.md        # Pasos de despliegue en Vercel y Neon
└── package.json     # Configuración de workspaces y scripts
```

## Seeds de productos

El módulo de API incluye un archivo [`seed/products.json`](apps/api/seed/products.json) con ocho productos: mesas, bandejas, utensilios y artículos decorativos de teca.  Puedes ejecutar un script para poblar la base de datos tras la primera migración.

## Cumplimiento y seguridad

* **PCI SAQ‑A** — todas las integraciones de tarjeta utilizan métodos de redirección o campos alojados.  No se almacena información sensible de tarjetas.
* **Criptomonedas** — las transacciones mediante BitPay se liquidan en USD/EUR/GBP o en la criptomoneda correspondiente.  Consulta `payments.md` para políticas de reembolso.

## Licencia

Este proyecto se publica bajo la licencia MIT.  Consulta el archivo `LICENSE` para más información.
