// apps/web/pages/admin/orders.tsx
import { useEffect, useState } from 'react';

type Order = {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  provider: string | null;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/orders?limit=50', { cache: 'no-store' });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Error cargando órdenes');
        setOrders(data);
      } catch (e: any) {
        setErr(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Órdenes</h1>

      {loading && <p>Cargando…</p>}
      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      {!loading && !err && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Monto</th>
              <th style={th}>Moneda</th>
              <th style={th}>Estado</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Creada</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={td}><code>{o.id}</code></td>
                <td style={td}>{o.amount.toLocaleString()}</td>
                <td style={td}>{o.currency_code}</td>
                <td style={td}>{o.status}</td>
                <td style={td}>{o.provider ?? '—'}</td>
                <td style={td}>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' };
const td: React.CSSProperties = { borderBottom: '1px solid #eee', padding: '8px' };
