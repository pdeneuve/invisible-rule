/**
 * Save the user's voice session and (optionally) trigger fulfillment.
 *
 * Browser-callable. We protect against drive-by abuse with:
 *   - Origin check (CORS-style; must come from our domain)
 *   - Per-IP rate limit
 *   - Minimum transcript length (rejects obviously empty/fake payloads)
 *
 * The browser tells us how to fulfill via the `mode` field:
 *   - 'free'    → trigger /api/fulfill-deep-dive
 *   - 'pending' → look up pending payment, verify tier matches, fulfill, delete
 *   - 'paid'    → save only (GHL webhook will fulfill after payment)
 *
 * Fulfillment is server-to-server (Authorization: Bearer), so the browser
 * never touches the heavy internal endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveSession, StoredSession } from '@/lib/session-store';
import { getPending, deletePending } from '@/lib/pending-store';
import {
  verifyOriginOrSameSite,
  rateLimit,
  getClientIp,
  internalAuthHeader,
} from '@/lib/auth';

interface SaveSessionBody extends Partial<StoredSession> {
  mode?: 'free' | 'pending' | 'paid';
  tier?: 1 | 2 | null;
}

const MIN_TRANSCRIPT_LENGTH = 50; // bytes; below this is almost certainly a fake call

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

async function triggerSendReport(
  firstName: string,
  email: string,
  report: Record<string, string>,
  sessionId: string,
): Promise<boolean> {
  const auth = internalAuthHeader();
  if (!auth) return false;
  try {
    const res = await fetch(`${appUrl()}/api/send-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ firstName, email, report, tier: 1, sessionId }),
    });
    return res.ok;
  } catch (err) {
    console.error('triggerSendReport error:', err);
    return false;
  }
}

async function triggerFulfillDeepDive(
  firstName: string,
  email: string,
  report: Record<string, string>,
  sessionId: string,
): Promise<boolean> {
  const auth = internalAuthHeader();
  if (!auth) return false;
  try {
    // Fire and forget for the long Deep Dive pipeline. The downstream function
    // has its own maxDuration and idempotency check; we don't block the user.
    fetch(`${appUrl()}/api/fulfill-deep-dive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ firstName, email, report, sessionId }),
    }).catch(err => console.error('fulfill-deep-dive fire-and-forget failed:', err));
    return true;
  } catch (err) {
    console.error('triggerFulfillDeepDive error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyOriginOrSameSite(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`save-session:${ip}`, 12)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  let body: SaveSessionBody;
  try {
    body = (await req.json()) as SaveSessionBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const transcript = body.transcript || '';
  if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
    return NextResponse.json({ error: 'transcript too short' }, { status: 400 });
  }

  const session: StoredSession = {
    email: body.email,
    firstName: body.firstName || '',
    sessionId: body.sessionId,
    transcript,
    report: body.report || null,
    createdAt: body.createdAt || new Date().toISOString(),
  };

  try {
    await saveSession(session);
  } catch (err) {
    console.error('save-session: saveSession failed:', err);
    return NextResponse.json({ error: 'storage failure' }, { status: 500 });
  }

  // No report → nothing to fulfill. Done.
  if (!session.report) {
    return NextResponse.json({ success: true, fulfilled: false, reason: 'no-report' });
  }

  const mode: 'free' | 'pending' | 'paid' = body.mode === 'pending' || body.mode === 'paid' ? body.mode : 'free';
  const claimedTier = body.tier;

  if (mode === 'paid') {
    // The GHL webhook is the source of truth for paid fulfillment.
    return NextResponse.json({ success: true, fulfilled: false, reason: 'awaiting-webhook' });
  }

  if (mode === 'pending') {
    // Verify the claimed pending tier matches what was actually paid.
    const pending = await getPending(session.email);
    if (!pending) {
      // No paid record found. Fall back to free fulfillment so the user isn't
      // stranded if the pending record was already cleaned up.
      const ok = await triggerFulfillDeepDive(
        session.firstName,
        session.email,
        session.report,
        session.sessionId,
      );
      return NextResponse.json({ success: true, fulfilled: ok, mode: 'free-fallback' });
    }

    if (claimedTier !== pending.tier) {
      console.warn(
        `save-session: claimed tier ${claimedTier} doesn't match paid tier ${pending.tier} for ${session.email}`,
      );
    }
    const tier = pending.tier;
    let ok = false;
    if (tier === 1) {
      ok = await triggerSendReport(
        session.firstName,
        session.email,
        session.report,
        session.sessionId,
      );
    } else {
      ok = await triggerFulfillDeepDive(
        session.firstName,
        session.email,
        session.report,
        session.sessionId,
      );
    }
    if (ok) {
      await deletePending(session.email);
    }
    return NextResponse.json({ success: true, fulfilled: ok, tier });
  }

  // mode === 'free'
  const ok = await triggerFulfillDeepDive(
    session.firstName,
    session.email,
    session.report,
    session.sessionId,
  );
  return NextResponse.json({ success: true, fulfilled: ok, mode: 'free' });
}
