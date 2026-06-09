import { put, head } from '@vercel/blob';
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
    // head() throws BlobNotFoundError when the marker is genuinely absent —
    // that's our happy "not yet fulfilled" path. Any OTHER error (network
    // hiccup, transient 5xx, auth) we treat as "fulfilled" so a retry can't
    // accidentally cause duplicate paid work; the caller may briefly stall
    // but we won't double-bill ElevenLabs / Creatomate.
    const name = (err as { name?: string })?.name || '';
    if (name === 'BlobNotFoundError') return false;
    console.error('isAlreadyFulfilled head() failed (failing closed):', err);
    return true;
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
