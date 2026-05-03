import { put, list } from '@vercel/blob';
import crypto from 'crypto';

export interface StoredSession {
  email: string;
  firstName: string;
  sessionId: string;
  transcript: string;
  report: Record<string, string> | null;
  createdAt: string;
}

function emailKey(email: string): string {
  const salt = process.env.SESSION_SALT || 'invisible-rule-sessions-v1';
  const hash = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim() + salt)
    .digest('hex');
  return `sessions/${hash}.json`;
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
