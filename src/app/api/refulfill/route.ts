import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/session-store';

/**
 * Test endpoint: trigger a fresh Deep Dive fulfillment using an already-
 * stored voice session looked up by email. Lets us iterate on the email
 * pipeline without running a new voice session every time.
 *
 * Auth: requires INTERNAL_FULFILL_SECRET as either X-Admin-Secret
 * header OR ?secret= query param. Prevents random people from spending
 * your paid API budget by triggering fulfillments for arbitrary emails.
 *
 * Usage:
 *   GET /api/refulfill?email=pdeneuve@gmail.com&secret=<INTERNAL_FULFILL_SECRET>
 */

function secretMatches(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

function isAuthorizedAdmin(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_FULFILL_SECRET || '';
  if (!expected) return false;
  const header = req.headers.get('x-admin-secret') || '';
  if (secretMatches(header, expected)) return true;
  const qp = new URL(req.url).searchParams.get('secret') || '';
  if (secretMatches(qp, expected)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      {
        error: 'Unauthorized. Provide admin secret.',
        hint: 'Add ?secret=<INTERNAL_FULFILL_SECRET> to the URL. Get the value from Vercel env vars.',
      },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const email = url.searchParams.get('email') || '';

  if (!email) {
    return NextResponse.json(
      { error: 'Missing ?email= parameter' },
      { status: 400 }
    );
  }

  const stored = await getSession(email);
  if (!stored) {
    return NextResponse.json(
      {
        error: 'No stored session found for that email',
        email,
        hint: 'Run a voice session with this email first so it gets saved server-side.',
      },
      { status: 404 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theinvisiblerule.com';
  const internalSecret = process.env.INTERNAL_FULFILL_SECRET || '';

  if (!internalSecret) {
    return NextResponse.json(
      { error: 'INTERNAL_FULFILL_SECRET not configured' },
      { status: 500 }
    );
  }

  // Fire fulfill-deep-dive in the background. fulfill-deep-dive gets its
  // own 5-minute Vercel budget once it starts, so it does not need this
  // request to stay alive. Return immediately so the browser does not
  // hang for minutes.
  fetch(`${baseUrl}/api/fulfill-deep-dive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: stored.firstName,
      email: stored.email,
      report: stored.report || {},
      sessionState: stored.sessionState,
      internalSecret,
    }),
  }).catch(err => console.error('background fulfill kick failed:', err));

  return NextResponse.json({
    triggeredFor: email,
    storedSessionFound: true,
    storedReportHasInvisibleRule: !!(stored.report as Record<string, string> | null)?.invisibleRule,
    storedSessionStateHasMessages: !!(stored.sessionState as { messages?: unknown[] } | undefined)?.messages?.length,
    status: 'fulfillment triggered in background — check email in 2-3 minutes',
  });
}
