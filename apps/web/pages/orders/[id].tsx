// apps/web/pages/orders/[id].tsx
import type { GetServerSideProps } from 'next'
import { useEffect, useState } from 'react'

type Order = {
  id: string
  items: any[]
  amount: number
  currency_code: string
  status: string
  provider: string | null
  created_at: string
}

type Props = { id: string }

export default function OrderStatusPage({ id }: Props) {
  const [order, setOrder] = useState<Order | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL!
    let timer: any

    async function load() {
      try {
        const r = await fetch(`${base}/orders/${encodeURIComponent(id)}`, { cache: 'no-store' })
        const data = await r.json()
        if (r.ok) {
          setOrder(data)
          // dejamos de hacer polling si ya NO está pending
          if (data.status && data.status !== 'pending') setDone(true)
        }
      } catch {}
    }

    load()
    timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [id])

  return (
    <main style={{ padding: 24, background: '#f5efe4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 12 }}>
        <h1>Estado de tu orden</h1>
        <p><b>ID:</b> <code>{id}</code></p>
        {!order && <p>Cargando…</p>}
        {order && (
          <>
            <p><b>Monto:</b> {order.amount.toLocaleString()} {order.currency_code}</p>
            <p><b>Estado:</b> {order.status}</p>
            <p><b>Proveedor:</b> {order.provider ?? '—'}</p>
            <p><b>Creada:</b> {new Date(order.created_at).toLocaleString()}</p>
            {!done && <p style={{ color: '#666' }}>Actualizando automáticamente…</p>}
          </>
        )}
      </div>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = String(ctx.params?.id || '')
  return { props: { id } }
}
