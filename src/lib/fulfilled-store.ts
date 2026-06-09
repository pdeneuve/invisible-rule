import { put, list } from '@vercel/blob';
import crypto from 'crypto';

/**
 * Records that a fulfillment has been executed for a given (email, tier,
 * sessionId) triple, so duplicate triggers (browser retry + webhook retry +
 * save-session pending) can short-circuit cleanly.
 *
 * Keys are hashed and stored privately on Vercel Blob.
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
    const { blobs } = await list({ prefix: key, limit: 1 });
    return blobs.some(b => b.pathname === key);
  } catch {
    return false;
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
