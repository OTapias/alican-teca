// apps/web/pages/api/create-order.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const base = process.env.NEXT_PUBLIC_API_URL; // Render API base
    const apiKey = process.env.API_KEY_FROM_VERCEL; // SECRETO (no usar NEXT_PUBLIC)

    if (!base || !apiKey) {
      return res.status(500).json({ error: 'Server misconfigured (API URL or key missing)' });
    }

    // Cuerpo que te envía el cliente (lo reusamos)
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const upstream = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,             // clave que NO expones al navegador
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[api/create-order] error:', err?.message || err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
