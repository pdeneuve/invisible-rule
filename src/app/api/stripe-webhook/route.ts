/**
 * Stripe Webhook — the safety net for closed-tab customers.
 *
 * The browser flow (Stripe redirect -> /thank-you -> verify-stripe-payment
 * -> fulfill-deep-dive) only works if the customer's browser actually
 * makes it back to /thank-you. If they close the tab right after paying
 * (very common on mobile), fulfillment never fires.
 *
 * This webhook handles that case: Stripe calls us directly, server-to-
 * server, whenever a checkout.session.completed event fires. We verify
 * the signature, dedupe against the browser path via Vercel Blob, and
 * kick fulfill-deep-dive with the internal secret.
 *
 * Configure in Stripe Dashboard -> Developers -> Webhooks:
 *   Endpoint URL: https://theinvisiblerule.com/api/stripe-webhook
 *   Events to send: checkout.session.completed
 *   Signing secret: STRIPE_WEBHOOK_SECRET (already in Vercel env)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { put, list } from '@vercel/blob';

// This route needs Node.js runtime for crypto.
export const runtime = 'nodejs';

/**
 * Verify a Stripe webhook signature without pulling in the Stripe SDK.
 * See https://stripe.com/docs/webhooks/signatures
 */
function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) {
      if (!acc[k]) acc[k] = v;
      else acc[k] = `${acc[k]},${v}`;
    }
    return acc;
  }, {});

  const timestamp = parts.t;
  const signatures = (parts.v1 || '').split(',');
  if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  // Replay protection
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  // Constant-time compare against ANY provided v1 signature
  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
    } catch {
      return false;
    }
  });
}

/**
 * Idempotency guard: has this Stripe session already been fulfilled?
 * We record a Blob under `webhook-processed/<stripe_session_id>.json`
 * the first time we see the event. On any subsequent call (retry, or
 * browser + webhook race), we short-circuit.
 */
async function isAlreadyFulfilled(sessionId: string): Promise<boolean> {
  try {
    const key = `webhook-processed/${sessionId}.json`;
    const { blobs } = await list({ prefix: key, limit: 1 });
    return blobs.some((b) => b.pathname === key);
  } catch (err) {
    console.warn('isAlreadyFulfilled lookup failed (treating as not fulfilled):', err);
    return false;
  }
}

async function markFulfilled(sessionId: string, metadata: unknown): Promise<void> {
  try {
    await put(
      `webhook-processed/${sessionId}.json`,
      JSON.stringify({ sessionId, at: new Date().toISOString(), metadata }),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    );
  } catch (err) {
    // Non-fatal: fulfillment already fired; worst case is a duplicate
    // email if the same webhook is redelivered.
    console.warn('markFulfilled write failed:', err);
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  if (!verifyStripeSignature(rawBody, signature, secret)) {
    console.error('Stripe webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // We only care about completed checkout sessions right now.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = (event.data?.object ?? {}) as {
    id?: string;
    payment_status?: string;
    customer_email?: string;
    metadata?: { tier?: string; firstName?: string; email?: string };
    amount_total?: number;
  };

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, skipped: 'not paid', payment_status: session.payment_status });
  }

  const sessionId = session.id || '';
  const tier = parseInt(session.metadata?.tier || '2', 10);
  const firstName = session.metadata?.firstName || '';
  const email = session.customer_email || session.metadata?.email || '';

  if (!sessionId || !email) {
    return NextResponse.json({ received: true, skipped: 'missing sessionId or email' });
  }

  // Idempotency check
  if (await isAlreadyFulfilled(sessionId)) {
    return NextResponse.json({ received: true, deduped: true, sessionId });
  }

  // Mark BEFORE firing to close the race with the browser path.
  await markFulfilled(sessionId, { tier, firstName, email, amount: session.amount_total });

  // Deep Dive: fire fulfill
  if (tier === 2) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theinvisiblerule.com';
    const internalSecret = process.env.INTERNAL_FULFILL_SECRET || '';
    if (!internalSecret) {
      console.error('INTERNAL_FULFILL_SECRET not set; webhook cannot fulfill Deep Dive');
      return NextResponse.json({ received: true, fulfilled: false, error: 'server misconfigured' });
    }

    // Await request initiation but not the full pipeline. Fulfill has
    // its own 5-minute Vercel budget.
    const fulfillPromise = fetch(`${baseUrl}/api/fulfill-deep-dive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        email,
        report: {},
        sessionState: null,
        internalSecret,
      }),
    }).catch((err) => {
      console.error('webhook fulfill-deep-dive kick failed:', err);
      return null;
    });

    await Promise.race([
      fulfillPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }

  return NextResponse.json({ received: true, fulfilled: true, sessionId, tier, email });
}
