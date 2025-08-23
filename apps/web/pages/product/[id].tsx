// apps/web/pages/product/[id].tsx
import type { GetServerSideProps } from 'next'
import Link from 'next/link'

type Product = {
  id: string
  title: string
  description: string
  price: number
  currency_code: string
  image?: string | null
}

type Props = { product: Product | null }

export default function ProductPage({ product }: Props) {
  if (!product) {
    return <main style={{ padding: 24 }}><h1>Producto no encontrado</h1></main>
  }

  return (
    <main style={{ padding: 24, background: '#f5efe4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 12 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>← Volver</Link>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginTop: 16 }}>
          <div style={{ background: '#f4f4f4', height: 320, borderRadius: 12, display: 'grid', placeItems: 'center' }}>
            <span style={{ color: '#999' }}>{product.image || '/placeholder.png'}</span>
          </div>
          <div>
            <h1 style={{ marginTop: 0 }}>{product.title}</h1>
            <p style={{ color: '#555' }}>{product.description}</p>
            <p style={{ fontSize: 28, margin: '16px 0' }}>
              {product.price.toLocaleString()} {product.currency_code}
            </p>
            <Link
              href={{ pathname: '/checkout', query: { id: product.id, qty: 1 } }}
              style={{
                display: 'inline-block', background: '#0b8c59', color: 'white',
                padding: '10px 16px', borderRadius: 8, textDecoration: 'none'
              }}
            >
              Comprar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = String(ctx.params?.id || '')
  const base = process.env.NEXT_PUBLIC_API_URL!
  try {
    const r = await fetch(`${base}/products/${encodeURIComponent(id)}`, { cache: 'no-store' })
    const product = r.ok ? await r.json() : null
    return { props: { product } }
  } catch {
    return { props: { product: null } }
  }
}
