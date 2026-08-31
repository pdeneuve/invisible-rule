import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * One-time admin endpoint to create the four Invisible Rule coupons in
 * Stripe so they can be redeemed on the Stripe Checkout page.
 *
 * Idempotent: if a coupon or promotion code already exists, the existing
 * one is left alone and reported as "exists".
 *
 * Auth: requires INTERNAL_FULFILL_SECRET as X-Admin-Secret header OR
 * ?secret= query param. Prevents crawlers or attackers from spamming
 * Stripe API calls on the account.
 */

const COUPONS = [
  { id: 'DEEPDIVEGIFT',    code: 'DEEPDIVEGIFT',    name: 'Deep Dive Gift — Free' },
  { id: 'CLIENT2026',      code: 'CLIENT2026',      name: 'Client 2026 — Free' },
  { id: 'TESTIMONIAL2026', code: 'TESTIMONIAL2026', name: 'Testimonial 2026 — Free' },
  { id: 'VIPACCESS',       code: 'VIPACCESS',       name: 'VIP Access — Free' },
];

/** Constant-time compare so timing attacks cannot leak the secret. */
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

async function runSetup(): Promise<NextResponse> {
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

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Provide admin secret.' }, { status: 401 });
  }
  return runSetup();
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized. Provide admin secret.' }, { status: 401 });
  }
  return runSetup();
}
