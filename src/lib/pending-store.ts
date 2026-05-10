import { put, list, del } from '@vercel/blob';
import crypto from 'crypto';

export interface PendingPayment {
  email: string;
  firstName: string;
  tier: 1 | 2;
  orderId?: string;
  paidAt: string;
}

function emailHash(email: string): string {
  const salt = process.env.SESSION_SALT || 'invisible-rule-sessions-v1';
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + salt)
    .digest('hex');
}

function pendingKey(email: string): string {
  return `pending/${emailHash(email)}.json`;
}

function processedKey(orderId: string): string {
  const hash = crypto.createHash('sha256').update(orderId).digest('hex');
  return `processed/${hash}.json`;
}

export async function savePending(data: PendingPayment): Promise<void> {
  const key = pendingKey(data.email);
  await put(key, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getPending(email: string): Promise<PendingPayment | null> {
  if (!email) return null;
  const key = pendingKey(email);
  const { blobs } = await list({ prefix: key, limit: 1 });
  const exact = blobs.find(b => b.pathname === key);
  if (!exact) return null;
  try {
    const res = await fetch(exact.url);
    if (!res.ok) return null;
    return (await res.json()) as PendingPayment;
  } catch {
    return null;
  }
}

export async function deletePending(email: string): Promise<void> {
  if (!email) return;
  const key = pendingKey(email);
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    const exact = blobs.find(b => b.pathname === key);
    if (exact) await del(exact.url);
  } catch {
    // best-effort cleanup
  }
}

export async function isOrderProcessed(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  const key = processedKey(orderId);
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    return blobs.some(b => b.pathname === key);
  } catch {
    return false;
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
