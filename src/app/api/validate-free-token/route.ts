/**
 * Validates a free-Deep-Dive access token.
 *
 * The token is shared out-of-band with existing clients. A matching token
 * grants free access to the full Deep Dive without going through Stripe.
 * Anyone without a matching token is required to pay via GHL/Stripe.
 *
 * The token is compared server-side so the secret never reaches the client
 * bundle. Rotate FREE_DEEP_DIVE_TOKEN in env to revoke leaked links.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let token = '';
  try {
    const body = await req.json();
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const expected = process.env.FREE_DEEP_DIVE_TOKEN || '';
  if (!expected || !token) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  return NextResponse.json({ valid: token === expected }, { status: 200 });
}
