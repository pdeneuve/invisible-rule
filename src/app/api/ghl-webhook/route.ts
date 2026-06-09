/**
 * GHL (GoHighLevel) Payment Webhook
 *
 * Inbound webhook from GoHighLevel after a Stripe payment. We:
 *  1. Verify the shared-secret header so only GHL can trigger fulfillment
 *  2. Detect the tier (Deep Dive $97 vs First Light $7) from explicit signals;
 *     refuse to guess on ambiguous payloads — better that GHL retries than
 *     that we mis-fulfill a $97 customer with a $7 product.
 *  3. Claim the orderId so retries don't double-fulfill
 *  4. For Tier 2: look up the user's saved voice session and trigger Deep Dive
 *  5. For Tier 1: send a payment confirmation email pointing to First Light
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession, savePendingPayment } from '@/lib/session-store';
import { isWebhookAuthorized } from '@/lib/api-auth';
import { claimOrder, releaseOrder } from '@/lib/idempotency';

export const maxDuration = 300;

const TIER_NAMES: Record<number, string> = {
  1: 'First Light',
  2: 'The Deep Dive',
};

const TIER_PRICES: Record<number, string> = {
  1: '$7',
  2: '$97',
};

interface GHLPayload {
  email?: string;
  contact_email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  amount?: number;
  total?: number;
  orderId?: string;
  order_id?: string;
  products?: Array<{
    name?: string;
    productId?: string;
    amount?: number;
    quantity?: number;
  }>;
  customFields?: Record<string, string>;
  custom_fields?: Record<string, string>;
  contactId?: string;
  contact_id?: string;
}

interface DetectResult {
  tier: 1 | 2 | null;
  reason: string;
}

/**
 * Refuse to silently default. Tier comes from:
 *  - explicit ?tier= query param (when GHL is configured per-product)
 *  - product name that explicitly says "first light" or "deep dive"
 *  - amount within a narrow tolerance of $7 or $97
 * Anything else returns null so the webhook responds 422 and GHL retries
 * (or surfaces in alerts).
 */
function detectTier(payload: GHLPayload, queryTier: number | null): DetectResult {
  if (queryTier === 1 || queryTier === 2) {
    return { tier: queryTier, reason: `query-tier=${queryTier}` };
  }

  const productName = (payload.products?.[0]?.name || '').toLowerCase();
  const nameSaysFirstLight = productName.includes('first light');
  const nameSaysDeepDive = productName.includes('deep dive');

  const amount = Number(payload.amount ?? payload.total ?? payload.products?.[0]?.amount ?? NaN);
  const amountIsFirstLight = amount >= 5 && amount <= 10;
  const amountIsDeepDive = amount >= 80 && amount <= 120;

  // If product name and amount both point the same way, accept.
  if (nameSaysDeepDive && (amountIsDeepDive || !Number.isFinite(amount))) {
    return { tier: 2, reason: 'product-name=deep-dive' };
  }
  if (nameSaysFirstLight && (amountIsFirstLight || !Number.isFinite(amount))) {
    return { tier: 1, reason: 'product-name=first-light' };
  }

  // Name silent? Trust amount only if it's unambiguous.
  if (amountIsDeepDive && !nameSaysFirstLight) {
    return { tier: 2, reason: `amount=${amount}` };
  }
  if (amountIsFirstLight && !nameSaysDeepDive) {
    return { tier: 1, reason: `amount=${amount}` };
  }

  return { tier: null, reason: `ambiguous (name="${productName}", amount=${amount})` };
}

function extractEmail(payload: GHLPayload): string {
  return (payload.email || payload.contact_email || '').trim().toLowerCase();
}

function extractName(payload: GHLPayload): string {
  return (payload.firstName || payload.first_name || 'Friend').trim();
}

function extractOrderId(payload: GHLPayload): string {
  return (payload.orderId || payload.order_id || '').trim();
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <onboarding@resend.dev>';
}

async function sendSimpleEmail(
  resend: Resend,
  to: string,
  subject: string,
  bodyHtml: string,
): Promise<void> {
  const wrapped = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;color:#cbd5e1;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;margin:0 auto 16px;line-height:56px;text-align:center;color:#0f172a;font-weight:700;">IR</div>
      <p style="color:#f59e0b;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;margin:0;">The Invisible Rule</p>
    </div>
    ${bodyHtml}
    <div style="text-align:center;border-top:1px solid #1e293b;padding-top:24px;margin-top:32px;">
      <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">&copy; ${new Date().getFullYear()} The Invisible Rule</p>
    </div>
  </div>
</body>
</html>`;
  await resend.emails.send({ from: fromAddress(), to, subject, html: wrapped });
}

async function sendNoSessionEmail(
  resend: Resend,
  email: string,
  firstName: string,
  tier: 1 | 2,
): Promise<void> {
  const tierName = TIER_NAMES[tier];
  const body = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:300;margin:0 0 16px;">${firstName}, one quick step.</h1>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your payment for ${tierName} was received. To deliver your personalized assets, we need your voice session first.</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">Take 30 to 60 minutes when you have a quiet room, then we will email you your complete ${tierName}.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl()}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Begin your voice session</a>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">Once your session is complete, your ${tierName} will be generated and emailed within minutes - automatically.</p>
  `;
  await sendSimpleEmail(resend, email, `${firstName}, complete your voice session to receive your ${tierName}`, body);
}

async function sendTier1ConfirmationEmail(
  resend: Resend,
  email: string,
  firstName: string,
): Promise<void> {
  const reportUrl = `${appUrl()}/processing?tier=1`;
  const body = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:300;margin:0 0 16px;">${firstName}, you're in.</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">First Light &middot; ${TIER_PRICES[1]}</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your payment was received. Your First Light report has been emailed to you separately.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Access Your First Light</a>
    </div>
  `;
  await sendSimpleEmail(resend, email, `${firstName}, your First Light is ready`, body);
}

async function fulfillDeepDive(
  firstName: string,
  email: string,
  sessionId: string | undefined,
  orderId: string,
): Promise<void> {
  const secret = (process.env.IR_INTERNAL_SECRET || process.env.INTERNAL_FULFILL_SECRET || '').trim();
  await fetch(`${appUrl()}/api/fulfill-deep-dive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-IR-Internal-Secret': secret } : {}),
    },
    body: JSON.stringify({
      firstName,
      email,
      sessionId,
      orderId,
    }),
  });
}

export async function POST(req: NextRequest) {
  // 1. Auth — must come from GHL with the shared secret
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse — body-parse error is a real failure GHL should retry on
  const { searchParams } = new URL(req.url);
  const queryTier = searchParams.get('tier') ? parseInt(searchParams.get('tier')!, 10) : null;

  let payload: GHLPayload;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      payload = Object.fromEntries(params.entries()) as GHLPayload;
    } else {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    }
  } catch {
    console.warn('GHL webhook: could not parse body');
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
  }

  // 3. Tier — refuse on ambiguity so GHL retries / alerts surface
  const { tier, reason } = detectTier(payload, queryTier);
  if (tier == null) {
    console.error('GHL webhook: tier could not be determined:', reason, payload);
    return NextResponse.json(
      { error: 'Tier could not be determined from payload', reason },
      { status: 422 },
    );
  }

  // 4. Required fields
  const email = extractEmail(payload);
  const firstName = extractName(payload);
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  // 5. Idempotency — claim the orderId. Missing orderId is itself a problem;
  //    we don't dedupe a payload that lacks one (would risk losing a real second
  //    sale), but we DO log it so it can be fixed in GHL config.
  const orderId = extractOrderId(payload);
  if (!orderId) {
    console.warn('GHL webhook: missing orderId — proceeding without dedupe', { email, tier });
  } else {
    const claimed = await claimOrder(orderId);
    if (!claimed) {
      return NextResponse.json(
        { received: true, tier, deduped: true, message: 'Order already processed' },
        { status: 200 },
      );
    }
  }

  // 6. Email infra check
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured');
    // 500 so GHL retries; the misconfiguration is on us, not on the payload.
    if (orderId) await releaseOrder(orderId);
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }
  const resend = new Resend(resendKey);

  // 7. Dispatch
  try {
    if (tier === 1) {
      await sendTier1ConfirmationEmail(resend, email, firstName);
      return NextResponse.json({ received: true, tier, fulfilled: true }, { status: 200 });
    }

    const session = await getSession(email);
    if (!session || !session.report) {
      // The user paid but hasn't completed (or hasn't yet persisted) a voice
      // session. We record a paid-pending marker so when their voice session
      // lands later — possibly on a different device — generate-report can
      // auto-trigger fulfillment server-side. We also email them with the
      // "come back to finish" link.
      await Promise.all([
        savePendingPayment({
          email,
          firstName,
          tier,
          orderId,
          createdAt: new Date().toISOString(),
        }),
        sendNoSessionEmail(resend, email, firstName, tier),
      ]);
      return NextResponse.json(
        { received: true, tier, fulfilled: false, reason: 'no-session', pendingSaved: true },
        { status: 200 },
      );
    }

    await fulfillDeepDive(session.firstName || firstName, email, session.sessionId, orderId);
    return NextResponse.json({ received: true, tier, fulfilled: true }, { status: 200 });
  } catch (err) {
    console.error('GHL webhook fulfillment error:', err);
    if (orderId) await releaseOrder(orderId);
    // Real internal failure — return 5xx so GHL retries.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GHL webhook endpoint active' }, { status: 200 });
}
