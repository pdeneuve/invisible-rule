/**
 * GHL (GoHighLevel) Payment Webhook
 *
 * STEP 1: Create 2 order forms in GHL:
 *   - "First Light"   - $7
 *   - "The Deep Dive" - $97
 *
 * STEP 2: Set SUCCESS REDIRECT URL for each:
 *   - First Light:   https://invisible-rule.vercel.app/processing?tier=1
 *   - The Deep Dive: https://invisible-rule.vercel.app/processing?tier=2
 *
 * STEP 3: Set WEBHOOK URL for each:
 *   - First Light:   https://invisible-rule.vercel.app/api/ghl-webhook?tier=1
 *   - The Deep Dive: https://invisible-rule.vercel.app/api/ghl-webhook?tier=2
 *
 * STEP 4: Add env vars to Vercel:
 *   NEXT_PUBLIC_GHL_URL_TIER1 = First Light order form URL
 *   NEXT_PUBLIC_GHL_URL_TIER2 = Deep Dive order form URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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

function detectTierFromPayload(payload: GHLPayload, queryTier: number | null): number {
  if (queryTier && [1, 2].includes(queryTier)) return queryTier;

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

async function sendConfirmationEmail(
  resend: Resend,
  email: string,
  firstName: string,
  tier: number,
  fromAddress: string
): Promise<void> {
  const tierName = TIER_NAMES[tier] || 'Your Report';
  const tierPrice = TIER_PRICES[tier] || '';
  const reportUrl = `https://invisible-rule.vercel.app/processing?tier=${tier}`;
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Confirmed - ${tierName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="text-align:center;margin-bottom:40px;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;margin:0 auto 16px;">
        <span style="color:#0f172a;font-weight:700;font-size:16px;line-height:56px;display:block;text-align:center;">IR</span>
      </div>
      <p style="color:#f59e0b;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 8px 0;">
        Payment Confirmed
      </p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:300;margin:0 0 6px 0;">
        ${firstName}, you're in.
      </h1>
      <p style="color:#64748b;font-size:14px;margin:0;">
        ${tierName} &middot; ${tierPrice}
      </p>
    </div>

    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 32px;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 16px 0;line-height:1.6;">
        Your payment was received. Your personalized assets are being prepared and will arrive in your inbox shortly. You can also click below to access them now.
      </p>
      <a href="${reportUrl}"
         style="display:block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:600;font-size:15px;padding:16px 24px;border-radius:10px;text-decoration:none;text-align:center;">
        Access Your ${tierName} Report
      </a>
    </div>

    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px 32px;margin-bottom:32px;">
      <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 14px 0;">
        What's included
      </p>
      ${tier === 1 ? `
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;padding-left:0;list-style:none;">
        <li>&middot; &nbsp;Your Invisible Rule - stated in full</li>
        <li>&middot; &nbsp;The One Insight That Changes Everything</li>
        <li>&middot; &nbsp;Download / share your report</li>
      </ul>
      ` : ''}
      ${tier === 2 ? `
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;padding-left:0;list-style:none;">
        <li>&middot; &nbsp;Complete multi-section analysis report</li>
        <li>&middot; &nbsp;Personalized audio podcast in Pamela's voice</li>
        <li>&middot; &nbsp;Branded slide deck of your key insights</li>
        <li>&middot; &nbsp;Personalized cinematic video narration</li>
        <li>&middot; &nbsp;30-day counter-strategy + neurological shift framework</li>
      </ul>
      ` : ''}
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#475569;font-size:12px;line-height:1.7;margin:0;">
        For the best experience, open the report link above in the same browser<br />
        you used for your voice session.
      </p>
    </div>

    <div style="text-align:center;border-top:1px solid #1e293b;padding-top:24px;">
      <p style="color:#334155;font-size:12px;line-height:1.6;margin:0;">
        &copy; ${year} The Invisible Rule
      </p>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `${firstName}, your ${tierName} is ready`,
    html,
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

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    const resend = new Resend(resendKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <onboarding@resend.dev>';
    try {
      await sendConfirmationEmail(resend, email, firstName, tier, fromAddress);
    } catch (err) {
      console.error('GHL webhook: failed to send confirmation email:', err);
    }
  }

  return NextResponse.json({
    received: true,
    tier,
    email: email ? `${email.slice(0, 3)}***` : 'none',
  }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ status: 'GHL webhook endpoint active' }, { status: 200 });
}
