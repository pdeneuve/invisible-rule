/**
 * Idempotency tracking for fulfillment operations.
 *
 * Uses Upstash Redis when configured (production); falls back to an in-memory
 * Map for local development. In-memory state does NOT survive serverless cold
 * starts — that's OK for dev, not OK for production. Always set the Upstash
 * env vars before relying on it for real payments.
 */

import { Redis } from '@upstash/redis';

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash ? Redis.fromEnv() : null;
const memoryStore = new Map<string, number>();

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — well past any GHL retry window

function key(orderId: string): string {
  return `ir:order:${orderId.trim().toLowerCase()}`;
}

/**
 * Try to claim an orderId for processing.
 * Returns true if this is the FIRST time we've seen this order (proceed).
 * Returns false if it's already been claimed (skip — return success to caller).
 */
export async function claimOrder(orderId: string): Promise<boolean> {
  if (!orderId) return true; // Caller already validated; this is a safety net only.
  const k = key(orderId);

  if (redis) {
    // SET NX EX — atomic claim. Returns 'OK' if claimed, null if already set.
    const ok = await redis.set(k, Date.now(), { nx: true, ex: TTL_SECONDS });
    return ok === 'OK';
  }

  if (memoryStore.has(k)) return false;
  memoryStore.set(k, Date.now());
  // Best-effort TTL for the in-memory map
  setTimeout(() => memoryStore.delete(k), TTL_SECONDS * 1000).unref?.();
  return true;
}

/**
 * Release a claim — used when fulfillment fails and we want a retry to succeed.
 * Not strictly required (the TTL will expire it anyway), but speeds up recovery.
 */
export async function releaseOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  const k = key(orderId);
  if (redis) {
    await redis.del(k);
    return;
  }
  memoryStore.delete(k);
}

/** Has this orderId been claimed? (for diagnostics — does not claim) */
export async function isOrderClaimed(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  const k = key(orderId);
  if (redis) {
    return (await redis.exists(k)) === 1;
  }
  return memoryStore.has(k);
}
