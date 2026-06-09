import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, ratelimiters } from '@/lib/ratelimit';

const EXPENSIVE_AI = new Set<string>([
  '/api/generate-report',
  '/api/generate-video',
  '/api/generate-audio',
  '/api/generate-slides',
  '/api/fulfill-deep-dive',
  '/api/mastery-coach',
]);

const CHAT = new Set<string>([
  '/api/bop-chat',
  '/api/vapi-llm',
  '/api/vapi-llm/chat/completions',
]);

const EMAIL = new Set<string>(['/api/send-report']);

// Webhooks come from trusted external services (GHL, VAPI) on fixed IPs
// with their own retry semantics — rate-limiting these by IP would
// block legitimate retries during incident recovery.
const WEBHOOKS = new Set<string>(['/api/ghl-webhook', '/api/vapi-webhook']);

function bucketFor(pathname: string): keyof typeof ratelimiters | null {
  if (WEBHOOKS.has(pathname)) return null;
  if (EXPENSIVE_AI.has(pathname)) return 'expensiveAi';
  if (CHAT.has(pathname)) return 'chat';
  if (EMAIL.has(pathname)) return 'email';
  if (pathname.startsWith('/api/')) return 'default';
  return null;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export async function proxy(request: NextRequest) {
  const bucket = bucketFor(request.nextUrl.pathname);
  if (!bucket) return NextResponse.next();

  const identifier = `${clientIp(request)}:${request.nextUrl.pathname}`;
  const { allowed, limit, remaining, reset } = await checkRateLimit(identifier, bucket);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': String(limit ?? ''),
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(reset ?? ''),
          'retry-after': String(Math.max(1, Math.ceil(((reset ?? Date.now()) - Date.now()) / 1000))),
        },
      },
    );
  }

  const res = NextResponse.next();
  if (limit !== undefined) {
    res.headers.set('x-ratelimit-limit', String(limit));
    res.headers.set('x-ratelimit-remaining', String(remaining ?? ''));
    res.headers.set('x-ratelimit-reset', String(reset ?? ''));
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
