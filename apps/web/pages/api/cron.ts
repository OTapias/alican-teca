// apps/web/pages/api/cron.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.authorization || '';
  const byHeader = auth === `Bearer ${secret}`;

  const byQuery =
    process.env.NODE_ENV !== 'production' &&
    typeof req.query.token === 'string' &&
    req.query.token === secret;

  if (!secret || (!byHeader && !byQuery)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const api = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const r = await fetch(`${api}/health`, { cache: 'no-store' });
    return res.status(200).json({ ok: true, status: r.status, ts: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
