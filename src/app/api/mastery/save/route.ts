import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBrowserOrigin, rateLimit, getClientIp } from '@/lib/auth';

export const runtime = 'edge';

function sanitizeKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export async function POST(req: NextRequest) {
  if (!verifyBrowserOrigin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`mastery-save:${getClientIp(req)}`, 20)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { email, chapter, data } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const key = sanitizeKey(email);
    const path = `mastery/${key}/progress.json`;

    // Load existing progress first
    let existing: Record<string, unknown> = {};
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: `mastery/${key}/` });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url);
        if (res.ok) existing = await res.json();
      }
    } catch {
      // No existing data - start fresh
    }

    // Merge new chapter data
    const updated = {
      ...existing,
      email,
      lastUpdated: new Date().toISOString(),
      [chapter]: data,
    };

    const blob = await put(path, JSON.stringify(updated), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (err) {
    console.error('Mastery save error:', err);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
