// apps/web/pages/api/admin/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const base = process.env.NEXT_PUBLIC_API_URL;       // Render API base
    const apiKey = process.env.API_KEY_FROM_VERCEL;     // SECRETO (no exponer)
    if (!base || !apiKey) return res.status(500).json({ error: 'Server misconfigured' });

    const limit = Number(req.query.limit ?? 20);
    const upstream = await fetch(`${base}/orders?limit=${encodeURIComponent(String(limit))}`, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });

    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[api/admin/orders] error:', err?.message || err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
