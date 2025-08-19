// apps/web/app/api/cron/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') || '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const api = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const r = await fetch(`${api}/health`, { cache: 'no-store' });
    return NextResponse.json({ ok: true, status: r.status, ts: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
