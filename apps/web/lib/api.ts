// apps/web/lib/api.ts
export async function fetchProducts() {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${base}/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando productos');
  return res.json();
}
