/**
 * Tipado de producto utilizado en el frontend.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

/**
 * Listado de productos de ejemplo utilizado para mostrar el catálogo.
 * En producción estos productos se obtendrán de la API de Medusa a través
 * de peticiones fetch.  Aquí se incluye un catálogo estático de ocho
 * artículos de teca para el entorno de desarrollo y demostración.
 */
export const products: Product[] = [
  {
    id: '1',
    name: 'Mesa de comedor rectangular',
    description: 'Mesa robusta de teca con acabado natural y capacidad para seis personas.',
    price: 1500000,
    image: '/placeholder.png',
  },
  {
    id: '2',
    name: 'Bandeja decorativa',
    description: 'Bandeja de teca ideal para servir aperitivos o decorar la mesa.',
    price: 120000,
    image: '/placeholder.png',
  },
  {
    id: '3',
    name: 'Juego de cubiertos',
    description: 'Set de cubiertos de teca tallados a mano, incluye tenedor, cuchillo y cuchara.',
    price: 80000,
    image: '/placeholder.png',
  },
  {
    id: '4',
    name: 'Tabla para cortar',
    description: 'Tabla resistente de teca perfecta para cortar y servir quesos o charcutería.',
    price: 95000,
    image: '/placeholder.png',
  },
  {
    id: '5',
    name: 'Florero tallado',
    description: 'Florero decorativo con detalles tallados a mano en madera de teca.',
    price: 60000,
    image: '/placeholder.png',
  },
  {
    id: '6',
    name: 'Lámpara de mesa',
    description: 'Lámpara de mesa con base de teca y pantalla de lino.',
    price: 180000,
    image: '/placeholder.png',
  },
  {
    id: '7',
    name: 'Cuenco rústico',
    description: 'Cuenco artesanal ideal para ensaladas o frutas.',
    price: 75000,
    image: '/placeholder.png',
  },
  {
    id: '8',
    name: 'Marco para fotografías',
    description: 'Marco de teca con vidrio frontal, perfecto para resaltar tus fotografías favoritas.',
    price: 45000,
    image: '/placeholder.png',
  },
];