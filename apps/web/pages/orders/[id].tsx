// apps/web/pages/orders/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Order = {
  id: string;
  amount: number;
  currency_code: string;
  status: 'pending' | 'paid' | 'failed' | string;
  provider: string | null;
  created_at?: string;
};

export default function OrderStatusPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;
    const api = process.env.NEXT_PUBLIC_API_URL!;
    let active = true;

    async function load() {
      const r = await fetch(`${api}/orders/${id}`);
      const j = await r.json();
      if (!active) return;
      setOrder(j);
    }

    load();
    const t = setInterval(() => {
      if (!order || order.status === 'pending') load();
    }, 3000);

    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id, order?.status]); // reintenta mientras esté pending

  if (!order) return <div style={{ padding: 24 }}>Cargando…</div>;

  return (
    <div className="container" style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,.06)',
        }}
      >
        <h2>Estado de tu orden</h2>
        <p><b>ID:</b> {order.id}</p>
        <p>
          <b>Monto:</b> {order.amount?.toLocaleString('es-CO')} {order.currency_code}
        </p>
        <p><b>Estado:</b> {order.status}</p>
        <p><b>Proveedor:</b> {order.provider || '—'}</p>
        <p><b>Creada:</b> {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</p>

        {order.status === 'pending' && (
          <p style={{ color: '#666' }}>
            Si acabas de volver de PayPal, el estado se actualizará automáticamente en unos segundos…
          </p>
        )}
      </div>
    </div>
  );
}
