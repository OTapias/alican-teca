import { motion } from 'framer-motion';
import Head from 'next/head';
import { Product, products } from '../lib/products';

export default function Home() {
  return (
    <>
      <Head>
        <title>Alican‑teca – Artefactos de teca</title>
        <meta name="description" content="Tienda premium de artefactos de madera de teca." />
      </Head>
      <main className="min-h-screen bg-teak-cream font-sans text-teak-graphite">
        <header className="py-8 px-4 text-center">
          <h1 className="text-4xl font-serif text-teak-dark mb-2">Alican‑teca</h1>
          <p className="text-lg text-teak-olive">Productos de teca de alta calidad hechos a mano</p>
        </header>
        <section className="grid gap-8 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((prod: Product) => (
            <motion.article
              key={prod.id}
              className="bg-white rounded shadow hover:shadow-lg overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="h-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${prod.image})` }}
              />
              <div className="p-4">
                <h2 className="font-serif text-xl mb-2 text-teak-dark">{prod.name}</h2>
                <p className="text-sm text-teak-graphite mb-4">{prod.description}</p>
                <p className="font-bold text-teak-olive">{prod.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
              </div>
            </motion.article>
          ))}
        </section>
      </main>
    </>
  );
}