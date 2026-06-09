/**
 * Save the user's voice session and (optionally) trigger fulfillment.
 *
 * Browser-callable. We protect against drive-by abuse with:
 *   - Origin/Referer check (must come from one of our hosts)
 *   - Per-IP rate limit
 *   - Minimum transcript length (rejects obviously empty/fake payloads)
 *
 * The browser tells us how to fulfill via the `mode` field:
 *   - 'free'    → trigger /api/fulfill-deep-dive (full Deep Dive)
 *   - 'pending' → look up the actual paid tier in pending-store, fulfill
 *                 that tier, then delete pending. Never trusts the browser's
 *                 claimed tier — server is authoritative.
 *   - 'paid'    → save only (GHL webhook will fulfill after payment).
 *
 * /api/fulfill-deep-dive responds quickly and runs the heavy work in an
 * `after()` continuation, so we can await it without blocking the user's
 * redirect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveSession, StoredSession } from '@/lib/session-store';
import { getPending, deletePending } from '@/lib/pending-store';
import {
  verifyBrowserOrigin,
  rateLimit,
  getClientIp,
  internalAuthHeader,
} from '@/lib/auth';

interface SaveSessionBody extends Partial<StoredSession> {
  mode?: 'free' | 'pending' | 'paid';
  tier?: 1 | 2 | null;
}

const MIN_TRANSCRIPT_LENGTH = 50;

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
    // fulfill-deep-dive returns fast (queues work via after()), so we can
    // safely await without blocking the user.
    const res = await fetch(`${appUrl()}/api/fulfill-deep-dive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ firstName, email, report, sessionId }),
    });
    return res.ok;
  } catch (err) {
    console.error('triggerFulfillDeepDive error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyBrowserOrigin(req)) {
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

  // Server-to-server auth is required for any fulfillment path. If the secret
  // is missing, return 500 so ops sees it — never silently drop the user.
  if (mode !== 'paid' && !internalAuthHeader()) {
    console.error('save-session: INTERNAL_API_SECRET missing; fulfillment unavailable');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  if (mode === 'paid') {
    // The GHL webhook is the source of truth for paid fulfillment.
    return NextResponse.json({ success: true, fulfilled: false, reason: 'awaiting-webhook' });
  }

  if (mode === 'pending') {
    // Verify the user actually paid by looking up the server-side record.
    // The browser's claimed tier (from ?pending=N URL) is NOT trusted.
    const pending = await getPending(session.email);
    if (!pending) {
      // No verified payment. Refuse to fulfill — don't hand out a free product.
      console.warn(
        `save-session: ?pending= requested for ${session.email} but no pending record found; refusing`,
      );
      return NextResponse.json(
        { success: true, fulfilled: false, reason: 'no-pending-payment' },
      );
    }

    const paidTier = pending.tier;
    const ok =
      paidTier === 1
        ? await triggerSendReport(session.firstName, session.email, session.report, session.sessionId)
        : await triggerFulfillDeepDive(session.firstName, session.email, session.report, session.sessionId);

    if (ok) {
      await deletePending(session.email);
    }
    return NextResponse.json({ success: true, fulfilled: ok, tier: paidTier });
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
