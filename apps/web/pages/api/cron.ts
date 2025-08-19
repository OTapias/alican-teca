// apps/web/pages/api/cron.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Vercel Cron envía: Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.authorization || '';
  const byHeader = auth === `Bearer ${secret}`;

  // Para pruebas LOCALES (dev) también permitimos ?token=<CRON_SECRET>
  const byQuery =
    process.env.NODE_ENV !== 'production' &&
    typeof req.query.token === 'string' &&
    req.query.token === secret;

  if (!secret || (!byHeader && !byQuery)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  // Tu API (Render) — ya tienes /health en server.js
  const api = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const r = await fetch(`${api}/health`, { cache: 'no-store' });
    return res.status(200).json({ ok: true, status: r.status, ts: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
