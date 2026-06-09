import { NextRequest } from 'next/server';

export const constantTimeEquals = (a: string, b: string): boolean => {
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

function allowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://invisible-rule.vercel.app',
    'https://theinvisiblerule.com',
    'https://www.theinvisiblerule.com',
    'http://localhost:3000',
  ].filter(Boolean) as string[];
}

function refererMatches(referer: string, allowed: string[]): boolean {
  try {
    const url = new URL(referer);
    const origin = `${url.protocol}//${url.host}`;
    return allowed.includes(origin);
  } catch {
    return false;
  }
}

/**
 * Origin/Referer check for browser-callable POST endpoints.
 *
 * Requires either:
 *   - an Origin header matching one of our hosts, OR
 *   - a Referer header whose origin matches one of our hosts.
 *
 * Rejects requests with NEITHER (e.g. curl-style cross-script abuse).
 *
 * Internal server-to-server callers should use verifyInternalSecret instead;
 * this helper is for endpoints that are reachable from the browser.
 */
export function verifyBrowserOrigin(req: NextRequest): boolean {
  const allowed = allowedOrigins();
  const origin = req.headers.get('origin');
  if (origin) return allowed.includes(origin);
  const referer = req.headers.get('referer');
  if (referer) return refererMatches(referer, allowed);
  return false;
}

/** Legacy alias retained so existing call sites keep working. */
export const verifyOriginOrSameSite = verifyBrowserOrigin;

/**
 * Verifies the Authorization header VAPI sends on custom-LLM and webhook calls.
 * VAPI is configured to send Bearer VAPI_SHARED_SECRET.
 */
export function verifyVapiSecret(req: NextRequest): boolean {
  const expected = process.env.VAPI_SHARED_SECRET;
  if (!expected) {
    console.error('VAPI_SHARED_SECRET env var is not set');
    return false;
  }
  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return constantTimeEquals(expected, provided);
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
