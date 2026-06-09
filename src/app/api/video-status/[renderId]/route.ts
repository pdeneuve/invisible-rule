import { NextRequest, NextResponse } from 'next/server';
import { verifyBrowserOrigin, rateLimit, getClientIp } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  if (!verifyBrowserOrigin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`video-status:${getClientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  const creatomateKey = process.env.CREATOMATE_API_KEY;
  if (!creatomateKey) return NextResponse.json({ error: 'CREATOMATE_API_KEY not configured' }, { status: 500 });

  const { renderId } = await params;

  const res = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
    headers: { 'Authorization': `Bearer ${creatomateKey}` },
  });

  if (!res.ok) return NextResponse.json({ error: `Creatomate status error (${res.status})` }, { status: 500 });

  const render = await res.json();

  return NextResponse.json({
    status: render.status,        // 'planned' | 'rendering' | 'succeeded' | 'failed'
    url: render.url ?? null,      // available when status === 'succeeded'
    errorMessage: render.errorMessage ?? null,
  });
}
