// apps/web/pages/debug-products.tsx
import Head from 'next/head';
import { fetchProducts } from '../lib/api';

export default function DebugProducts({ products }: { products: any[] }) {
  return (
    <>
      <Head><title>Debug Productos</title></Head>
      <main style={{ padding: 16 }}>
        <h1>Productos (desde API)</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(products, null, 2)}
        </pre>
      </main>
    </>
  );
}

export async function getServerSideProps() {
  const products = await fetchProducts().catch(() => []);
  return { props: { products } };
}
