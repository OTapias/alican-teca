// apps/web/pages/api/pay/simulate.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BASE = process.env.NEXT_PUBLIC_API_URL!;
const ADMIN_KEY = process.env.API_KEY_FROM_VERCEL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { orderId, status = 'paid', provider = 'test' } =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const upstream = await fetch(`${BASE}/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { 'x-api-key': ADMIN_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ status, provider }),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e: any) {
    console.error('[api/pay/simulate] error:', e.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
