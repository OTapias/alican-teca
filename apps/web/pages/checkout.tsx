// apps/web/pages/checkout.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

type Product = {
  id: string;
  title: string;
  description: string;
  price: number; // asumimos en unidades (COP sin decimales)
  currency_code: string;
  image?: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { id, qty } = router.query as { id?: string; qty?: string };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const quantity = useMemo(() => Math.max(1, Number(qty || 1)), [qty]);

  useEffect(() => {
    if (!id) return;
    const api = process.env.NEXT_PUBLIC_API_URL!;
    fetch(`${api}/products/${id}`)
      .then((r) => r.json())
      .then((p) => setProduct(p))
      .catch(() => setProduct(null));
  }, [id]);

  const total = useMemo(() => {
    if (!product) return 0;
    return product.price * quantity;
  }, [product, quantity]);

  async function handlePayPal() {
    if (!product || !id) return;
    try {
      setLoading(true);

      // 1) Crea orden LOCAL (en Render) vía tu API route Next (/api/create-order)
      const r1 = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: product.id, qty: quantity }],
          amount: total, // en unidades (p.ej. 1500000 COP -> "1500000.00" en server)
          currency: product.currency_code || 'COP',
        }),
      });
      const order = await r1.json();
      if (!r1.ok) throw order;

      // 2) Pide crear la orden PayPal y consigue la URL de aprobación
      const origin = window.location.origin;
      const r2 = await fetch('/api/pay/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_order_id: order.id,
          amount: total,
          currency: product.currency_code || 'COP',
          return_url: `${origin}/orders/${order.id}`,
          cancel_url: `${origin}/orders/${order.id}`,
        }),
      });
      const j2 = await r2.json();
      if (!r2.ok || !j2.approveUrl) throw j2;

      // 3) Redirige a PayPal
      window.location.href = j2.approveUrl;
    } catch (e: any) {
      console.error(e);
      alert('No se pudo iniciar el pago con PayPal.');
    } finally {
      setLoading(false);
    }
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: 24 }}>
        Cargando…
      </div>
    );
  }

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
        <h2>Checkout</h2>
        <p style={{ color: '#666' }}>
          {product.title}
          <br />
          <small>Precio unitario: {product.price.toLocaleString('es-CO')} {product.currency_code}</small>
        </p>
        <p>
          <b>Cantidad</b> &nbsp; {quantity}
        </p>
        <h3>
          Total:&nbsp; {total.toLocaleString('es-CO')} {product.currency_code}
        </h3>

        <button
          onClick={handlePayPal}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#0070ba',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Redirigiendo…' : 'Pagar con PayPal'}
        </button>
      </div>
    </div>
  );
}
