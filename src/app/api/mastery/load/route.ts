import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBrowserOrigin, rateLimit, getClientIp } from '@/lib/auth';

export const runtime = 'edge';

function sanitizeKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export async function GET(req: NextRequest) {
  if (!verifyBrowserOrigin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`mastery-load:${getClientIp(req)}`, 20)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const key = sanitizeKey(email);
    const { blobs } = await list({ prefix: `mastery/${key}/` });

    if (blobs.length === 0) {
      return NextResponse.json({ exists: false, data: null });
    }

    const res = await fetch(blobs[0].url);
    if (!res.ok) {
      return NextResponse.json({ exists: false, data: null });
    }

    const data = await res.json();
    return NextResponse.json({ exists: true, data });
  } catch (err) {
    console.error('Mastery load error:', err);
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
