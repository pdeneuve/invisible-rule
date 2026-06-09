/**
 * Shared API auth helpers.
 *
 * Three layers:
 *  1. Webhook secret  — for inbound webhooks from external services (GHL, etc.)
 *  2. Internal secret — for server→server calls inside our own app
 *  3. Session token   — short-lived HMAC token issued at voice-session start,
 *                       proves a browser request is tied to a real session
 *
 * Plus a same-origin check for browser-callable endpoints that need a soft gate.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Webhook auth: check X-IR-Webhook-Secret header against env var. */
export function isWebhookAuthorized(req: Request): boolean {
  const expected = (process.env.IR_WEBHOOK_SECRET || '').trim();
  if (!expected) return false;
  const got = req.headers.get('x-ir-webhook-secret') || '';
  return safeEqual(got, expected);
}

/** Internal auth: check X-IR-Internal-Secret header for server→server calls. */
export function isInternalAuthorized(req: Request): boolean {
  // Accept either the new IR_INTERNAL_SECRET or the legacy INTERNAL_FULFILL_SECRET
  // so existing env vars keep working during the rollout.
  const candidates = [
    (process.env.IR_INTERNAL_SECRET || '').trim(),
    (process.env.INTERNAL_FULFILL_SECRET || '').trim(),
  ].filter(Boolean);
  if (candidates.length === 0) return false;
  const got = req.headers.get('x-ir-internal-secret') || '';
  return candidates.some(c => safeEqual(got, c));
}

/**
 * Same-origin guard for browser-callable endpoints.
 * Accepts the request only if Origin or Referer matches the deployed app.
 */
export function isSameOrigin(req: Request): boolean {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app').replace(/\/$/, '');
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  if (origin && origin === appUrl) return true;
  if (referer && referer.startsWith(appUrl)) return true;
  // Vercel preview deployments use *.vercel.app. Allow same-tld previews when
  // appUrl ends with vercel.app — this is a deliberate widen so previews work.
  if (appUrl.endsWith('.vercel.app')) {
    try {
      if (origin && new URL(origin).hostname.endsWith('.vercel.app')) return true;
      if (referer && new URL(referer).hostname.endsWith('.vercel.app')) return true;
    } catch { /* malformed origin/referer */ }
  }
  return false;
}

const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6h — generous; voice session is ~30-60min

/**
 * Sign a session token: HMAC(sessionId | issuedAt) using IR_SESSION_HMAC_KEY.
 * Returned as `<issuedAtMs>.<sessionId>.<hexSig>`.
 */
export function signSessionToken(sessionId: string, issuedAt = Date.now()): string {
  const key = process.env.IR_SESSION_HMAC_KEY || '';
  if (!key) throw new Error('IR_SESSION_HMAC_KEY not configured');
  const payload = `${issuedAt}.${sessionId}`;
  const sig = createHmac('sha256', key).update(payload).digest('hex');
  return `${issuedAt}.${sessionId}.${sig}`;
}

/** Validate a session token and return its sessionId, or null if invalid/expired. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const key = process.env.IR_SESSION_HMAC_KEY || '';
  if (!key) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [issuedAtStr, sessionId, sig] = parts;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_TTL_MS) return null;
  const payload = `${issuedAt}.${sessionId}`;
  const expected = createHmac('sha256', key).update(payload).digest('hex');
  if (!safeEqual(sig, expected)) return null;
  return sessionId;
}

/** Convenience: read the session token from the body OR Authorization header. */
export function extractSessionToken(req: Request, bodyToken?: string): string | null {
  if (bodyToken) return bodyToken;
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}
