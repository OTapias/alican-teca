import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const api = process.env.NEXT_PUBLIC_API_URL!;
    const { local_order_id, amount, currency, return_url, cancel_url } = req.body;

    const r = await fetch(`${api}/payments/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_order_id, amount, currency, return_url, cancel_url }),
    });

    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);
    return res.status(200).json(j);
  } catch (e: any) {
    return res.status(500).json({ error: 'server_error', message: e?.message });
  }
}
