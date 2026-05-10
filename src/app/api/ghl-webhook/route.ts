/**
 * GHL (GoHighLevel) Payment Webhook
 *
 * On Tier 2 (Deep Dive $97) payment:
 *   - Looks up the user's saved voice session by email
 *   - Calls /api/fulfill-deep-dive (which generates audio + video and emails everything)
 *   - If no session exists yet, emails the user with a link to complete the voice session first
 *
 * On Tier 1 (First Light $7) payment:
 *   - Looks up the user's saved voice session by email
 *   - Emails the First Light report via /api/send-report
 *   - If no session exists yet, emails the user with a link to complete the voice session first
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/session-store';
import {
  savePending,
  isOrderProcessed,
  markOrderProcessed,
} from '@/lib/pending-store';

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

function detectTierFromPayload(payload: GHLPayload, queryTier: number | null): 1 | 2 {
  if (queryTier === 1 || queryTier === 2) return queryTier;

  const productName = payload.products?.[0]?.name?.toLowerCase() || '';
  if (productName.includes('first light')) return 1;
  if (productName.includes('deep dive')) return 2;

  const amount = payload.amount || payload.total || payload.products?.[0]?.amount || 0;
  if (amount <= 15) return 1;
  if (amount >= 50) return 2;

  return 1;
}

function extractEmail(payload: GHLPayload): string {
  return payload.email || payload.contact_email || '';
}

function extractName(payload: GHLPayload): string {
  return payload.firstName || payload.first_name || 'Friend';
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
  bodyHtml: string
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
  tier: number
): Promise<void> {
  const tierName = TIER_NAMES[tier];
  const sessionUrl = `${appUrl()}/?pending=${tier}`;
  const body = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:300;margin:0 0 16px;">${firstName}, one quick step.</h1>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Your payment for ${tierName} was received. To deliver your personalized assets, we need your voice session first.</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">Take 30 to 60 minutes when you have a quiet room, then we will email you your complete ${tierName}.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${sessionUrl}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Begin your voice session</a>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">Once your session is complete, your ${tierName} will be generated and emailed within minutes - automatically.</p>
  `;
  await sendSimpleEmail(resend, email, `${firstName}, complete your voice session to receive your ${tierName}`, body);
}

async function fulfillFirstLight(
  firstName: string,
  email: string,
  report: Record<string, string>
): Promise<void> {
  await fetch(`${appUrl()}/api/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, email, report, tier: 1 }),
  });
}

async function fulfillDeepDive(
  firstName: string,
  email: string,
  report: Record<string, string>
): Promise<void> {
  await fetch(`${appUrl()}/api/fulfill-deep-dive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, email, report }),
  });
}

export async function POST(req: NextRequest) {
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
  } catch {
    console.warn('GHL webhook: could not parse body');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.log('GHL webhook received:', JSON.stringify({ queryTier, payload }, null, 2));

  const tier = detectTierFromPayload(payload, queryTier);
  const email = extractEmail(payload);
  const firstName = extractName(payload);
  const orderId = payload.orderId || payload.order_id || '';

  // Idempotency: if GHL retries the same order, skip duplicate fulfillment.
  if (orderId && (await isOrderProcessed(orderId))) {
    console.log(`GHL webhook: order ${orderId} already processed, skipping`);
    return NextResponse.json(
      { received: true, tier, fulfilled: true, idempotent: true },
      { status: 200 },
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !email) {
    console.warn('Skipping fulfillment - missing RESEND_API_KEY or email');
    return NextResponse.json({ received: true, tier, fulfilled: false }, { status: 200 });
  }

  const resend = new Resend(resendKey);

  try {
    const session = await getSession(email);
    if (!session || !session.report) {
      // User paid before completing their voice session. Save a pending record
      // so save-session can fulfill once the session is done.
      if (tier === 1 || tier === 2) {
        await savePending({
          email,
          firstName,
          tier,
          orderId: orderId || undefined,
          paidAt: new Date().toISOString(),
        });
      }
      await sendNoSessionEmail(resend, email, firstName, tier);
      // Mark the order processed so GHL retries don't re-trigger this branch.
      // Fulfillment will be driven by the browser when the user completes their
      // voice session via the ?pending= link in the no-session email.
      if (orderId) await markOrderProcessed(orderId);
      return NextResponse.json(
        { received: true, tier, fulfilled: false, reason: 'pending-session' },
        { status: 200 },
      );
    }

    const resolvedFirstName = session.firstName || firstName;

    if (tier === 1) {
      await fulfillFirstLight(resolvedFirstName, email, session.report);
    } else {
      await fulfillDeepDive(resolvedFirstName, email, session.report);
    }

    if (orderId) await markOrderProcessed(orderId);

    return NextResponse.json({ received: true, tier, fulfilled: true }, { status: 200 });
  } catch (err) {
    console.error('GHL webhook fulfillment error:', err);
    return NextResponse.json({ received: true, tier, fulfilled: false, error: 'internal' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GHL webhook endpoint active' }, { status: 200 });
}
