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

const STATUSES = ['pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded'] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders?limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error cargando');
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function update(id: string, fields: Partial<Pick<Order, 'status' | 'provider'>>) {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <main style={{ padding: 24, background: '#f5efe4', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Órdenes</h1>

      {error && <p style={{ color: 'crimson' }}>⚠ {error}</p>}
      {loading ? <p>Cargando…</p> : null}

      {!loading && !!orders.length && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Monto</th>
              <th style={th}>Moneda</th>
              <th style={th}>Estado</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Creada</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={tdMono}>{o.id}</td>
                <td style={td}>{o.amount.toLocaleString()}</td>
                <td style={td}>{o.currency_code}</td>
                <td style={td}>{o.status}</td>
                <td style={td}>{o.provider ?? '—'}</td>
                <td style={td}>{new Date(o.created_at).toLocaleString()}</td>
                <td style={td}>
                  <select
                    defaultValue=""
                    disabled={saving === o.id}
                    onChange={e => {
                      const v = e.target.value;
                      if (!v) return;
                      update(o.id, { status: v as any });
                      e.currentTarget.value = '';
                    }}
                  >
                    <option value="">Cambiar estado…</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    style={{ marginLeft: 8 }}
                    disabled={saving === o.id}
                    onClick={() => update(o.id, { status: 'paid' })}
                  >
                    Marcar pagada
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !orders.length && <p>No hay órdenes</p>}
    </main>
  );
}

const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '10px 8px', background: '#faf7f0' };
const td: React.CSSProperties = { borderBottom: '1px solid #eee', padding: '8px' };
const tdMono: React.CSSProperties = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
