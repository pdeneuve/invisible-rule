import { put, list, del, head } from '@vercel/blob';
import crypto from 'crypto';

export interface PendingPayment {
  email: string;
  firstName: string;
  tier: 1 | 2;
  orderId?: string;
  paidAt: string;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function emailHash(email: string): string {
  const salt = process.env.SESSION_SALT || 'invisible-rule-sessions-v1';
  return crypto
    .createHash('sha256')
    .update(normalizeEmail(email) + salt)
    .digest('hex');
}

function orderIdHash(orderId: string): string {
  return crypto.createHash('sha256').update(orderId.trim()).digest('hex');
}

function pendingPrefix(email: string): string {
  return `pending/${emailHash(email)}/`;
}

function pendingKey(email: string, paidAtIso: string): string {
  // Salt the path with the paid-at timestamp so saves under the same email
  // can coexist briefly and the URL is unguessable from email alone.
  return `${pendingPrefix(email)}${paidAtIso}.json`;
}

function processedKey(orderId: string): string {
  return `processed/${orderIdHash(orderId)}.json`;
}

export async function savePending(data: PendingPayment): Promise<void> {
  if (!data.email) throw new Error('savePending requires email');
  const paidAt = data.paidAt || new Date().toISOString();
  const key = pendingKey(data.email, paidAt);
  const payload = { ...data, email: normalizeEmail(data.email), paidAt };
  await put(key, JSON.stringify(payload), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/**
 * Returns the most recent pending payment for this email, or null.
 */
export async function getPending(email: string): Promise<PendingPayment | null> {
  if (!email) return null;
  try {
    const { blobs } = await list({ prefix: pendingPrefix(email), limit: 50 });
    if (blobs.length === 0) return null;
    blobs.sort((a, b) => {
      const aTime = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : Date.parse(String(a.uploadedAt));
      const bTime = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : Date.parse(String(b.uploadedAt));
      return bTime - aTime;
    });
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return (await res.json()) as PendingPayment;
  } catch {
    return null;
  }
}

/**
 * Removes ALL pending records for this email. Should only be called once we
 * have successfully fulfilled the matching tier.
 */
export async function deletePending(email: string): Promise<void> {
  if (!email) return;
  try {
    const { blobs } = await list({ prefix: pendingPrefix(email), limit: 50 });
    for (const blob of blobs) {
      try { await del(blob.url); } catch { /* best-effort */ }
    }
  } catch {
    /* best-effort cleanup */
  }
}

export async function isOrderProcessed(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  const key = processedKey(orderId);
  try {
    const info = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return !!info;
  } catch (err) {
    // Same fail-closed pattern as fulfilled-store. BlobNotFoundError → not
    // yet processed; anything else → treat as processed to avoid duplicate
    // GHL-initiated fulfillment on a transient blob error.
    const name = (err as { name?: string })?.name || '';
    if (name === 'BlobNotFoundError') return false;
    console.error('isOrderProcessed head() failed (failing closed):', err);
    return true;
  }
}

export async function markOrderProcessed(orderId: string): Promise<void> {
  if (!orderId) return;
  const key = processedKey(orderId);
  await put(
    key,
    JSON.stringify({ orderId, processedAt: new Date().toISOString() }),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
}
