import { NextRequest } from 'next/server';

const constantTimeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

/**
 * Verifies the X-GHL-Webhook-Secret header against GHL_WEBHOOK_SECRET.
 * Fails closed when the env var is missing.
 */
export function verifyGhlSecret(req: NextRequest): boolean {
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (!expected) {
    console.error('GHL_WEBHOOK_SECRET env var is not set');
    return false;
  }
  const provided = req.headers.get('x-ghl-webhook-secret') || '';
  return constantTimeEquals(expected, provided);
}

/**
 * Verifies the Authorization: Bearer header against INTERNAL_API_SECRET.
 * Use on endpoints that should never be reachable from the browser.
 */
export function verifyInternalSecret(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    console.error('INTERNAL_API_SECRET env var is not set');
    return false;
  }
  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return constantTimeEquals(expected, provided);
}

/**
 * Returns the Authorization header value for one of our server routes
 * calling another internal route. Returns null when the secret is missing.
 */
export function internalAuthHeader(): string | null {
  const secret = process.env.INTERNAL_API_SECRET;
  return secret ? `Bearer ${secret}` : null;
}

/**
 * Loose origin check for browser-callable endpoints. Accepts our known
 * production hosts and localhost. Returns true if the request has no
 * Origin header (server-to-server fetch) so internal calls still pass;
 * pair with verifyInternalSecret for sensitive ops.
 */
export function verifyOriginOrSameSite(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const allowed = new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://invisible-rule.vercel.app',
      'https://theinvisiblerule.com',
      'https://www.theinvisiblerule.com',
      'http://localhost:3000',
    ].filter(Boolean) as string[],
  );
  return allowed.has(origin);
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory per-key rate limit. Returns true if the call is allowed.
 * Buckets are per warm function instance; fine for low traffic.
 */
export function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}
