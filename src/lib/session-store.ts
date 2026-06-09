import { put, list, del } from '@vercel/blob';
import crypto from 'crypto';

export interface StoredSession {
  email: string;
  firstName: string;
  sessionId: string;
  transcript: string;
  report: Record<string, string> | null;
  createdAt: string;
}

/**
 * Cross-device payment recovery (H1).
 *
 * When a customer pays via GHL but hasn't completed (or hasn't yet persisted)
 * their voice session, the webhook drops a "paid-pending" marker keyed by
 * email. When `saveSession` later lands the report, callers can check
 * `getPendingPayment(email)` and trigger fulfillment server-side instead of
 * relying on the browser tab being open.
 */
export interface PendingPayment {
  email: string;
  firstName: string;
  tier: 1 | 2;
  orderId: string;
  createdAt: string;
}

function hashForKey(email: string): string {
  const salt = process.env.SESSION_SALT || 'invisible-rule-sessions-v1';
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + salt)
    .digest('hex');
}

function emailKey(email: string): string {
  return `sessions/${hashForKey(email)}.json`;
}

function pendingKey(email: string): string {
  return `paid-pending/${hashForKey(email)}.json`;
}

export async function saveSession(data: StoredSession): Promise<void> {
  const key = emailKey(data.email);
  await put(key, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getSession(email: string): Promise<StoredSession | null> {
  if (!email) return null;
  const key = emailKey(email);
  const { blobs } = await list({ prefix: key, limit: 1 });
  const exact = blobs.find(b => b.pathname === key);
  if (!exact) return null;
  const res = await fetch(exact.url);
  if (!res.ok) return null;
  return (await res.json()) as StoredSession;
}

export async function savePendingPayment(p: PendingPayment): Promise<void> {
  const key = pendingKey(p.email);
  await put(key, JSON.stringify(p), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getPendingPayment(email: string): Promise<PendingPayment | null> {
  if (!email) return null;
  const key = pendingKey(email);
  const { blobs } = await list({ prefix: key, limit: 1 });
  const exact = blobs.find(b => b.pathname === key);
  if (!exact) return null;
  const res = await fetch(exact.url);
  if (!res.ok) return null;
  return (await res.json()) as PendingPayment;
}

export async function deletePendingPayment(email: string): Promise<void> {
  if (!email) return;
  const key = pendingKey(email);
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    const exact = blobs.find(b => b.pathname === key);
    if (exact) await del(exact.url);
  } catch (err) {
    console.warn('deletePendingPayment: non-fatal', err);
  }
}
