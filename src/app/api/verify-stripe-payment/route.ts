import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies a Stripe Checkout Session was paid, then triggers Deep Dive
 * fulfillment. Called by the thank-you page when it sees a stripe_session_id
 * in the URL.
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const { sessionId, report, sessionState } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Fetch the session from Stripe to confirm payment status
  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${stripeKey}` },
    }
  );

  const session = await stripeRes.json();
  if (!stripeRes.ok) {
    console.error('Stripe session fetch failed:', stripeRes.status, session);
    return NextResponse.json({ error: 'Could not verify payment', detail: session }, { status: 500 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { verified: false, payment_status: session.payment_status },
      { status: 200 }
    );
  }

  const tier = parseInt(session.metadata?.tier || '2');
  const firstName = session.metadata?.firstName || '';
  const email = session.customer_email || session.metadata?.email || '';

  if (!email) {
    return NextResponse.json({ verified: true, error: 'No email on session' }, { status: 200 });
  }

  // Tier 2 — trigger Deep Dive fulfillment. The endpoint accepts the
  // internal secret so we don't need a coupon/freeToken here.
  if (tier === 2) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theinvisiblerule.com';
    const internalSecret = process.env.INTERNAL_FULFILL_SECRET || '';
    if (!internalSecret) {
      console.warn('INTERNAL_FULFILL_SECRET not set — cannot trigger Deep Dive fulfillment');
      return NextResponse.json({ verified: true, fulfilled: false, error: 'Server fulfillment not configured' }, { status: 200 });
    }
    try {
      fetch(`${baseUrl}/api/fulfill-deep-dive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          report: report || {},
          sessionState: sessionState || null,
          internalSecret,
        }),
      });
    } catch (err) {
      console.error('Triggering fulfill-deep-dive failed:', err);
    }
    return NextResponse.json({ verified: true, fulfilled: true, tier, email, firstName });
  }

  return NextResponse.json({ verified: true, fulfilled: false, tier, email, firstName });
}
