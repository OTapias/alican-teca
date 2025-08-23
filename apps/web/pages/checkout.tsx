// apps/web/pages/checkout.tsx
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

type Product = {
  id: string
  title: string
  price: number
  currency_code: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const id = String(router.query.id || '')
  const initialQty = Number(router.query.qty || 1)

  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState(Math.max(1, initialQty))
  const [creating, setCreating] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const amount = useMemo(() => (product ? product.price * qty : 0), [product, qty])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL!
    if (!id) return
    fetch(`${base}/products/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setProduct)
      .catch(() => setErr('No se pudo cargar el producto'))
  }, [id])

  async function createOrder() {
    if (!product) return
    setCreating(true); setErr(null)
    try {
      const r = await fetch('/api/create-order', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({
          items: [{ id: product.id, qty }],
          amount,
          currency: product.currency_code
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'No se pudo crear la orden')
      setOrderId(data.id)
    } catch (e:any) {
      setErr(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function simulatePay(status: 'paid'|'failed'|'cancelled', provider='test') {
    if (!orderId) return
    const r = await fetch('/api/pay/simulate', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ orderId, status, provider })
    })
    await r.json().catch(() => ({}))
    router.push(`/orders/${encodeURIComponent(orderId)}`)
  }

  return (
    <main style={{ padding: 24, background: '#f5efe4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 12 }}>
        <h1>Checkout</h1>
        {!product && <p>Cargando producto…</p>}
        {product && (
          <>
            <p style={{ marginBottom: 4 }}><b>{product.title}</b></p>
            <p style={{ marginTop: 0, color: '#666' }}>
              Precio unitario: {product.price.toLocaleString()} {product.currency_code}
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e)=>setQty(Math.max(1, Number(e.target.value||1)))}
                style={{ width: 80, padding: 6 }}
              />
            </div>

            <p style={{ fontSize: 20 }}>
              Total: <b>{amount.toLocaleString()} {product.currency_code}</b>
            </p>

            {!orderId ? (
              <button disabled={creating} onClick={createOrder} style={btnPrimary}>
                {creating ? 'Creando…' : 'Crear orden'}
              </button>
            ) : (
              <>
                <div style={{ marginTop: 12, padding: 12, background: '#faf7f0', borderRadius: 8 }}>
                  Orden creada: <code>{orderId}</code>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => simulatePay('paid', 'test')} style={btnPrimary}>Pagar (simulado)</button>
                  <button onClick={() => simulatePay('failed', 'test')} style={btnGhost}>Fallar pago</button>
                  <button onClick={() => simulatePay('cancelled', 'test')} style={btnGhost}>Cancelar</button>
                </div>
              </>
            )}

            {err && <p style={{ color: 'crimson', marginTop: 12 }}>⚠ {err}</p>}
          </>
        )}
      </div>
    </main>
  )
}

const btnPrimary: React.CSSProperties = {
  background: '#0b8c59', color: 'white', padding: '10px 16px',
  borderRadius: 8, border: 'none', cursor: 'pointer'
}
const btnGhost: React.CSSProperties = {
  background: 'white', color: '#333', padding: '10px 16px',
  borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer'
}
