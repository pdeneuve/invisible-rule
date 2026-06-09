import { put, head, del } from '@vercel/blob';
import crypto from 'crypto';

/**
 * Records that a fulfillment has been executed for a given (email, tier,
 * sessionId) triple, so duplicate triggers (browser retry + webhook retry +
 * save-session pending) can short-circuit cleanly.
 *
 * We use `head()` for the existence check rather than `list()` because
 * Vercel Blob's `list()` is eventually consistent and a fast retry can
 * miss a marker that was just written.
 */

function emailHash(email: string): string {
  const salt = process.env.SESSION_SALT || 'invisible-rule-sessions-v1';
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + salt)
    .digest('hex');
}

function fulfillmentKey(email: string, tier: 1 | 2, sessionId: string): string {
  return `fulfilled/${emailHash(email)}-t${tier}-${sessionId}.json`;
}

/**
 * Returns true only when the fulfillment marker is confirmed present.
 * BlobNotFoundError → returns false (the legitimate "not yet" path).
 * Any other head() error is RETHROWN so the caller can decide whether to
 * 5xx (and let the upstream retry) instead of silently claiming the work
 * is done. Logged before rethrowing.
 */
export async function isAlreadyFulfilled(
  email: string,
  tier: 1 | 2,
  sessionId: string,
): Promise<boolean> {
  if (!email || !sessionId) return false;
  const key = fulfillmentKey(email, tier, sessionId);
  try {
    const info = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return !!info;
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'BlobNotFoundError') return false;
    console.error('isAlreadyFulfilled head() failed:', err);
    throw err;
  }
}

export async function markFulfilled(
  email: string,
  tier: 1 | 2,
  sessionId: string,
): Promise<void> {
  if (!email || !sessionId) return;
  const key = fulfillmentKey(email, tier, sessionId);
  await put(
    key,
    JSON.stringify({ tier, sessionId, fulfilledAt: new Date().toISOString() }),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
}

/**
 * Roll back the fulfillment marker. Used when the heavy work that ran AFTER
 * markFulfilled threw, so a manual or upstream retry can re-attempt.
 */
export async function clearFulfilled(
  email: string,
  tier: 1 | 2,
  sessionId: string,
): Promise<void> {
  if (!email || !sessionId) return;
  const key = fulfillmentKey(email, tier, sessionId);
  try {
    const info = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    if (info?.url) await del(info.url);
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name !== 'BlobNotFoundError') {
      console.error('clearFulfilled error:', err);
    }
  }
}
