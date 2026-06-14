import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a Stripe Checkout Session for Deep Dive ($97) or First Light ($7).
 * Uses Stripe REST API directly so no SDK install is needed.
 *
 * Env vars required:
 *   STRIPE_SECRET_KEY      — secret API key from Stripe dashboard
 *   NEXT_PUBLIC_APP_URL    — base URL (defaults to https://theinvisiblerule.com)
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel.' },
      { status: 500 }
    );
  }

  type Body = { firstName?: string; email?: string; tier?: 1 | 2 };
  const { firstName = '', email = '', tier = 2 }: Body = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const isDeepDive = tier === 2;
  const priceCents = isDeepDive ? 9700 : 700;
  const productName = isDeepDive
    ? 'The Deep Dive — The Invisible Rule'
    : 'First Light — The Invisible Rule';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theinvisiblerule.com';
  const successUrl = `${baseUrl}/thank-you?tier=${tier}&stripe_session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/processing?tier=1&free=1`;

  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('success_url', successUrl);
  body.append('cancel_url', cancelUrl);
  body.append('customer_email', email);
  body.append('allow_promotion_codes', 'true');
  body.append('line_items[0][quantity]', '1');
  body.append('line_items[0][price_data][currency]', 'usd');
  body.append('line_items[0][price_data][unit_amount]', String(priceCents));
  body.append('line_items[0][price_data][product_data][name]', productName);
  body.append('metadata[tier]', String(tier));
  body.append('metadata[firstName]', firstName);
  body.append('metadata[email]', email);
  body.append('payment_intent_data[metadata][tier]', String(tier));
  body.append('payment_intent_data[metadata][firstName]', firstName);
  body.append('payment_intent_data[metadata][email]', email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('Stripe checkout creation failed:', res.status, json);
    return NextResponse.json(
      { error: json?.error?.message || 'Stripe error', detail: json },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: json.url, sessionId: json.id });
}
