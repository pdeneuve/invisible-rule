import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time admin endpoint to create the four Invisible Rule coupons in
 * Stripe so they can be redeemed on the Stripe Checkout page.
 *
 * Idempotent: if a coupon or promotion code already exists, the existing
 * one is left alone and reported as "exists".
 */

const COUPONS = [
  { id: 'DEEPDIVEGIFT',    code: 'DEEPDIVEGIFT',    name: 'Deep Dive Gift — Free' },
  { id: 'CLIENT2026',      code: 'CLIENT2026',      name: 'Client 2026 — Free' },
  { id: 'TESTIMONIAL2026', code: 'TESTIMONIAL2026', name: 'Testimonial 2026 — Free' },
  { id: 'VIPACCESS',       code: 'VIPACCESS',       name: 'VIP Access — Free' },
];

async function stripeForm(path: string, key: string, body: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured in Vercel.' },
      { status: 500 }
    );
  }

  const results: Array<{
    code: string;
    coupon: 'created' | 'exists' | 'error';
    promotion: 'created' | 'exists' | 'error';
    detail?: string;
  }> = [];

  for (const c of COUPONS) {
    let couponStatus: 'created' | 'exists' | 'error' = 'error';
    let promoStatus: 'created' | 'exists' | 'error' = 'error';
    let detail = '';

    // 1) Create the coupon (100% off, forever)
    const couponBody = new URLSearchParams();
    couponBody.append('id', c.id);
    couponBody.append('percent_off', '100');
    couponBody.append('duration', 'forever');
    couponBody.append('name', c.name);
    const couponRes = await stripeForm('/coupons', stripeKey, couponBody);
    if (couponRes.ok) {
      couponStatus = 'created';
    } else if (
      couponRes.json?.error?.code === 'resource_already_exists' ||
      couponRes.json?.error?.message?.toLowerCase().includes('already exists')
    ) {
      couponStatus = 'exists';
    } else {
      detail = `coupon: ${couponRes.json?.error?.message || JSON.stringify(couponRes.json)}`;
      results.push({ code: c.code, coupon: couponStatus, promotion: 'error', detail });
      continue;
    }

    // 2) Create the promotion code (the human-readable string customers type)
    const promoBody = new URLSearchParams();
    promoBody.append('coupon', c.id);
    promoBody.append('code', c.code);
    const promoRes = await stripeForm('/promotion_codes', stripeKey, promoBody);
    if (promoRes.ok) {
      promoStatus = 'created';
    } else if (
      promoRes.json?.error?.code === 'resource_already_exists' ||
      promoRes.json?.error?.message?.toLowerCase().includes('already exists') ||
      promoRes.json?.error?.message?.toLowerCase().includes('already in use')
    ) {
      promoStatus = 'exists';
    } else {
      detail = `promo: ${promoRes.json?.error?.message || JSON.stringify(promoRes.json)}`;
    }

    results.push({ code: c.code, coupon: couponStatus, promotion: promoStatus, detail });
  }

  return NextResponse.json({ results });
}

export async function GET(req: NextRequest) {
  // Convenience: allow GET so user can hit the URL from a button.
  void req;
  return POST();
}
