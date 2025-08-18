// apps/web/pages/order-test.tsx
import { useState } from 'react';
import Head from 'next/head';

export default function OrderTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createOrder() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // payload de ejemplo; aquí pondrás lo que necesites realmente
        body: JSON.stringify({ items: [{ id: '1', qty: 1 }], notes: 'test' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error creando orden');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Probar orden</title></Head>
      <main style={{ padding: 16 }}>
        <h1>Probar creación de orden</h1>
        <button onClick={createOrder} disabled={loading}>
          {loading ? 'Creando…' : 'Crear orden de prueba'}
        </button>

        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
        {result && (
          <>
            <h2>Respuesta</h2>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </>
        )}
      </main>
    </>
  );
}
