// apps/web/pages/api/admin/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BASE = process.env.NEXT_PUBLIC_API_URL!;            // https://alican-teca-api.onrender.com
const ADMIN_KEY = process.env.API_KEY_FROM_VERCEL!;       // secreto

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!BASE || !ADMIN_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const headers: Record<string, string> = {
    'x-api-key': ADMIN_KEY,
    'content-type': 'application/json',
  };

  try {
    // GET /api/admin/orders?limit=...
    if (req.method === 'GET' && !req.query.id) {
      const limit = String(req.query.limit ?? '50');
      const upstream = await fetch(`${BASE}/orders?limit=${encodeURIComponent(limit)}`, { headers, cache: 'no-store' });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    // GET /api/admin/orders?id=...
    if (req.method === 'GET' && req.query.id) {
      const id = String(req.query.id);
      const upstream = await fetch(`${BASE}/orders/${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    // PATCH /api/admin/orders?id=...   body: { status?, provider? }
    if (req.method === 'PATCH') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const upstream = await fetch(`${BASE}/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(typeof req.body === 'string' ? JSON.parse(req.body) : req.body),
      });
      const data = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(data);
    }

    res.setHeader('Allow', 'GET,PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/admin/orders] error:', err?.message || err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
