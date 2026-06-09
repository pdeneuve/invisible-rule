/**
 * GHL (GoHighLevel) Payment Webhook
 *
 * Auth: requires X-GHL-Webhook-Secret header matching GHL_WEBHOOK_SECRET.
 *
 * On Tier 2 (Deep Dive $97) payment:
 *   - Looks up the user's saved voice session by email
 *   - Internally calls /api/fulfill-deep-dive (audio + slides + video + email)
 *   - If no session exists yet, saves a pending record and emails the user a
 *     "complete your voice session" link that carries ?pending=2
 *
 * On Tier 1 (First Light $7) payment:
 *   - Looks up the user's saved voice session by email
 *   - Internally calls /api/send-report
 *   - If no session, same pending-record + nudge email behaviour
 *
 * Idempotency: orderId-based via processed-orders blob store. Duplicate GHL
 * deliveries short-circuit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/session-store';
import {
  savePending,
  isOrderProcessed,
  markOrderProcessed,
} from '@/lib/pending-store';
import { verifyGhlSecret, internalAuthHeader } from '@/lib/auth';
import { escapeHtml } from '@/lib/safe-html';

export const maxDuration = 300;

const TIER_NAMES: Record<number, string> = {
  1: 'First Light',
  2: 'The Deep Dive',
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

/**
 * Strict tier detection. Returns null if we can't determine the tier with
 * high confidence — caller should reject the webhook rather than guess.
 *
 * Precedence:
 *   1. ?tier= query param (must be 1 or 2)
 *   2. Product name contains "first light" or "deep dive"
 *   3. Amount matches one of the known prices exactly ($7 or $97)
 */
function detectTier(payload: GHLPayload, queryTier: number | null): 1 | 2 | null {
  if (queryTier === 1 || queryTier === 2) return queryTier;

  const productName = payload.products?.[0]?.name?.toLowerCase() || '';
  if (productName.includes('first light')) return 1;
  if (productName.includes('deep dive')) return 2;

  const amount = Number(
    payload.amount ?? payload.total ?? payload.products?.[0]?.amount ?? NaN,
  );
  if (amount === 7) return 1;
  if (amount === 97) return 2;

  return null;
}

function extractEmail(payload: GHLPayload): string {
  return (payload.email || payload.contact_email || '').trim();
}

function extractName(payload: GHLPayload): string {
  return (payload.firstName || payload.first_name || 'Friend').trim();
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
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#cbd5e1;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;color:#cbd5e1;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;margin:0 auto 16px;line-height:56px;text-align:center;color:#0f172a;font-weight:700;">IR</div>
      <p style="color:#f59e0b;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;margin:0;">The Invisible Rule</p>
    </div>
    ${bodyHtml}
    <div style="text-align:center;border-top:1px solid #1e293b;padding-top:24px;margin-top:32px;">
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">&copy; ${new Date().getFullYear()} The Invisible Rule</p>
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
  const safeName = escapeHtml(firstName);
  const sessionUrl = `${appUrl()}/?pending=${tier}`;
  const body = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:300;margin:0 0 16px;">${safeName}, one quick step.</h1>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px;">Your payment for ${tierName} was received. To deliver your personalized assets, we need your voice session first.</p>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 24px;">Take 30 to 60 minutes when you have a quiet room, then we will email you your complete ${tierName}.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${sessionUrl}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Begin your voice session</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0;">Once your session is complete, your ${tierName} will be generated and emailed within minutes - automatically.</p>
  `;
  await sendSimpleEmail(resend, email, `${firstName}, complete your voice session to receive your ${tierName}`, body);
}

async function fulfillFirstLight(
  firstName: string,
  email: string,
  report: Record<string, string>,
  sessionId: string,
): Promise<boolean> {
  const auth = internalAuthHeader();
  if (!auth) return false;
  try {
    const res = await fetch(`${appUrl()}/api/send-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ firstName, email, report, tier: 1, sessionId }),
    });
    return res.ok;
  } catch (err) {
    console.error('fulfillFirstLight error:', err);
    return false;
  }
}

async function fulfillDeepDive(
  firstName: string,
  email: string,
  report: Record<string, string>,
  sessionId: string,
): Promise<boolean> {
  const auth = internalAuthHeader();
  if (!auth) return false;
  try {
    const res = await fetch(`${appUrl()}/api/fulfill-deep-dive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ firstName, email, report, sessionId }),
    });
    return res.ok;
  } catch (err) {
    console.error('fulfillDeepDive error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Auth: reject anyone who isn't GHL.
  if (!verifyGhlSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryTier = searchParams.get('tier') ? parseInt(searchParams.get('tier')!) : null;

  let payload: GHLPayload = {};
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
      if (text) payload = JSON.parse(text);
    }
  } catch (err) {
    console.error('GHL webhook: body parse failed', err);
    // 4xx → GHL retries are not productive but the failure is visible in logs.
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  console.log('GHL webhook received:', JSON.stringify({ queryTier, payload }, null, 2));

  const tier = detectTier(payload, queryTier);
  if (tier === null) {
    return NextResponse.json(
      { error: 'cannot determine tier; include ?tier=1 or ?tier=2 in the webhook URL' },
      { status: 400 },
    );
  }

  const email = extractEmail(payload);
  const firstName = extractName(payload);
  const orderId = (payload.orderId || payload.order_id || '').trim();

  // Idempotency: if GHL retries the same order, skip duplicate fulfillment.
  if (orderId && (await isOrderProcessed(orderId))) {
    console.log(`GHL webhook: order ${orderId} already processed, skipping`);
    return NextResponse.json(
      { received: true, tier, fulfilled: true, idempotent: true },
      { status: 200 },
    );
  }

  // Config sanity. 5xx so GHL retries when ops fixes it.
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('GHL webhook: RESEND_API_KEY missing');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }
  if (!email) {
    console.error('GHL webhook: payload missing email');
    return NextResponse.json({ error: 'missing email in payload' }, { status: 400 });
  }
  if (!internalAuthHeader()) {
    console.error('GHL webhook: INTERNAL_API_SECRET missing');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const resend = new Resend(resendKey);

  try {
    const session = await getSession(email);
    if (!session || !session.report) {
      // User paid before completing their voice session. Save a pending record
      // so save-session can fulfill once the session is done.
      await savePending({
        email,
        firstName,
        tier,
        orderId: orderId || undefined,
        paidAt: new Date().toISOString(),
      });
      let nudgeOk = true;
      try {
        await sendNoSessionEmail(resend, email, firstName, tier);
      } catch (err) {
        nudgeOk = false;
        console.error('sendNoSessionEmail failed:', err);
      }
      // Only mark the order processed if the nudge email actually went out.
      // Otherwise let GHL retry so the customer hears from us.
      if (orderId && nudgeOk) await markOrderProcessed(orderId);
      return NextResponse.json(
        { received: nudgeOk, tier, fulfilled: false, reason: 'pending-session' },
        { status: nudgeOk ? 200 : 500 },
      );
    }

    const resolvedFirstName = session.firstName || firstName;
    const sessionId = session.sessionId;

    const ok = tier === 1
      ? await fulfillFirstLight(resolvedFirstName, email, session.report, sessionId)
      : await fulfillDeepDive(resolvedFirstName, email, session.report, sessionId);

    if (!ok) {
      // 5xx so GHL retries; do NOT mark processed
      console.error(`GHL webhook: fulfillment failed for tier ${tier} email ${email}`);
      return NextResponse.json(
        { received: true, tier, fulfilled: false, error: 'fulfillment-failed' },
        { status: 500 },
      );
    }

    if (orderId) await markOrderProcessed(orderId);
    return NextResponse.json({ received: true, tier, fulfilled: true }, { status: 200 });
  } catch (err) {
    console.error('GHL webhook fulfillment error:', err);
    return NextResponse.json(
      { received: true, tier, fulfilled: false, error: 'internal' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GHL webhook endpoint active' }, { status: 200 });
}
