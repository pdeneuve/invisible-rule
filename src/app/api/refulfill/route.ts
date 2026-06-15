import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

/**
 * Test endpoint: trigger a fresh Deep Dive fulfillment using an already-
 * stored voice session looked up by email. Lets us iterate on the email
 * pipeline without running a new voice session every time.
 *
 * Usage:
 *   GET /api/refulfill?email=pdeneuve@gmail.com
 *
 * Returns a JSON status report showing what was triggered, plus
 * fires /api/fulfill-deep-dive in the background so the email arrives.
 */
export async function GET(req: NextRequest) {
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
