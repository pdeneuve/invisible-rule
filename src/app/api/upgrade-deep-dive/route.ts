import { NextRequest, NextResponse } from 'next/server';

/**
 * Email-friendly upgrade link. Takes an email in the query string,
 * creates a Stripe Checkout Session for the Deep Dive ($97), and
 * 302-redirects to the Stripe page. Used as the button URL in the
 * First Light email so users can pay without needing localStorage.
 */
export async function GET(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get('email') || '';
  const firstName = url.searchParams.get('firstName') || '';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theinvisiblerule.com';
  const successUrl = `${baseUrl}/thank-you?tier=2&stripe_session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/`;

  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('success_url', successUrl);
  body.append('cancel_url', cancelUrl);
  if (email) body.append('customer_email', email);
  body.append('allow_promotion_codes', 'true');
  body.append('line_items[0][quantity]', '1');
  body.append('line_items[0][price_data][currency]', 'usd');
  body.append('line_items[0][price_data][unit_amount]', '9700');
  body.append('line_items[0][price_data][product_data][name]', 'The Deep Dive — The Invisible Rule');
  body.append('metadata[tier]', '2');
  body.append('metadata[firstName]', firstName);
  body.append('metadata[email]', email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (!res.ok || !json.url) {
    console.error('upgrade-deep-dive checkout creation failed:', res.status, json);
    return NextResponse.redirect(`${baseUrl}/?mode=paid`, 302);
  }

  return NextResponse.redirect(json.url, 302);
}
