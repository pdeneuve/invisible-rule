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

function sessionPrefix(email: string): string {
  return `sessions/${emailHash(email)}/`;
}

function sessionKey(email: string, sessionId: string): string {
  // Path includes the sessionId so two parallel sessions never overwrite each
  // other, AND so an attacker who somehow guesses the email-hash still can't
  // construct the URL without also knowing the sessionId (a UUID).
  return `${sessionPrefix(email)}${sessionId}.json`;
}

export async function saveSession(data: StoredSession): Promise<void> {
  if (!data.email || !data.sessionId) {
    throw new Error('saveSession requires email and sessionId');
  }
  const key = sessionKey(data.email, data.sessionId);
  await put(
    key,
    JSON.stringify({ ...data, email: normalizeEmail(data.email) }),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
}

/**
 * Returns the most-recently-saved session for the given email, or null.
 * Lists all sessions under the email-hash prefix, picks the latest by
 * uploadedAt. This makes paths unenumerable from email alone (every save
 * lives under a UUID subkey).
 */
export async function getSession(email: string): Promise<StoredSession | null> {
  if (!email) return null;
  try {
    const { blobs } = await list({ prefix: sessionPrefix(email), limit: 50 });
    if (blobs.length === 0) return null;
    blobs.sort((a, b) => {
      const aTime = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : Date.parse(String(a.uploadedAt));
      const bTime = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : Date.parse(String(b.uploadedAt));
      return bTime - aTime;
    });
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return (await res.json()) as StoredSession;
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}
