import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.CRON_SECRET || '';

  // SOLO Bearer en producción
  const bearer = (req.headers.authorization || '').split(' ')[1];
  const allowBearer = !!bearer && bearer === secret;

  // En dev permitimos ?token=<CRON_SECRET>
  const allowDevQuery =
    process.env.NODE_ENV !== 'production' &&
    typeof req.query.token === 'string' &&
    req.query.token === secret;

  if (!(allowBearer || allowDevQuery)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) throw new Error('Missing NEXT_PUBLIC_API_URL');

    const r = await fetch(`${api}/health`, { cache: 'no-store' });
    return res.status(200).json({ ok: true, status: r.status, ts: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || 'Internal error' });
  }
}
