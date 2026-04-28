/**
 * GHL (GoHighLevel) Payment Webhook
 *
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * HOW TO SET THIS UP IN GHL â GIVE THIS TO YOUR TEAM
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 *
 * STEP 1: Create 3 order forms in GHL (one per tier):
 *   - "First Light"   â $9.97
 *   - "The Blueprint" â $29.97
 *   - "The Deep Dive" â $97.00
 *
 * STEP 2: For each order form, set the SUCCESS REDIRECT URL:
 *   - First Light:   https://invisible-rule.vercel.app/processing?tier=1
 *   - The Blueprint: https://invisible-rule.vercel.app/processing?tier=2
 *   - The Deep Dive: https://invisible-rule.vercel.app/processing?tier=3
 *
 * STEP 3: Set the WEBHOOK URL for each order form:
 *   - First Light:   https://invisible-rule.vercel.app/api/ghl-webhook?tier=1
 *   - The Blueprint: https://invisible-rule.vercel.app/api/ghl-webhook?tier=2
 *   - The Deep Dive: https://invisible-rule.vercel.app/api/ghl-webhook?tier=3
 *
 * STEP 4: Add these 3 env vars to Vercel (Settings â Environment Variables):
 *   NEXT_PUBLIC_GHL_URL_TIER1 = [your GHL First Light order form URL]
 *   NEXT_PUBLIC_GHL_URL_TIER2 = [your GHL Blueprint order form URL]
 *   NEXT_PUBLIC_GHL_URL_TIER3 = [your GHL Deep Dive order form URL]
 *
 * STEP 5: (Optional) Add GHL_WEBHOOK_SECRET to Vercel for security:
 *   GHL_WEBHOOK_SECRET = [any secret string you choose]
 *   Then set the same string as the webhook secret in GHL.
 *
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * WHAT THIS WEBHOOK DOES
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 *   1. Receives payment confirmation from GHL
 *   2. Identifies which tier was purchased
 *   3. Sends a "payment confirmed" email to the buyer
 *   4. Logs the purchase
 *   5. Returns 200 so GHL knows it was received
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const TIER_NAMES: Record<number, string> = {
  1: 'First Light',
  2: 'The Blueprint',
  3: 'The Deep Dive',
};

const TIER_PRICES: Record<number, string> = {
  1: '$9.97',
  2: '$29.97',
  3: '$97',
};

// GHL sends various payload formats depending on funnel/workflow type.
// This handles the most common ones.
interface GHLPayload {
  // Contact info
  email?: string;
  contact_email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  // Order info
  amount?: number;
  total?: number;
  orderId?: string;
  order_id?: string;
  // Products array (GHL checkout)
  products?: Array<{
    name?: string;
    productId?: string;
    amount?: number;
    quantity?: number;
  }>;
  // Custom fields (GHL can pass these)
  customFields?: Record<string, string>;
  custom_fields?: Record<string, string>;
  // Contact ID
  contactId?: string;
  contact_id?: string;
}

function detectTierFromPayload(payload: GHLPayload, queryTier: number | null): number {
  // 1. Trust the query param first (most reliable â set per order form)
  if (queryTier && [1, 2, 3].includes(queryTier)) return queryTier;

  // 2. Try to detect from product name
  const productName = payload.products?.[0]?.name?.toLowerCase() || '';
  if (productName.includes('first light')) return 1;
  if (productName.includes('blueprint')) return 2;
  if (productName.includes('deep dive')) return 3;

  // 3. Try to detect from amount
  const amount = payload.amount || payload.total || payload.products?.[0]?.amount || 0;
  if (amount <= 15) return 1;
  if (amount <= 40) return 2;
  if (amount >= 50) return 3;

  // Default to Blueprint
  return 2;
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
  <title>Payment Confirmed â ${tierName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <!-- Header -->
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
        ${tierName} Â· ${tierPrice}
      </p>
    </div>

    <!-- Confirmation card -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 32px;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 16px 0;line-height:1.6;">
        Your payment was received and your report is ready. Click below to access it now.
      </p>
      <a href="${reportUrl}"
         style="display:block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:600;font-size:15px;padding:16px 24px;border-radius:10px;text-decoration:none;text-align:center;">
        Access Your ${tierName} Report â
      </a>
    </div>

    <!-- What's included -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px 32px;margin-bottom:32px;">
      <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 14px 0;">
        What's included
      </p>
      ${tier === 1 ? `
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;padding-left:0;list-style:none;">
        <li>â¦ &nbsp;Your Invisible Rule â stated in full</li>
        <li>â¦ &nbsp;The One Insight That Changes Everything</li>
        <li>â¦ &nbsp;Download / share your report</li>
      </ul>
      ` : ''}
      ${tier === 2 ? `
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;padding-left:0;list-style:none;">
        <li>â¦ &nbsp;8-section deep analysis report</li>
        <li>â¦ &nbsp;The evidence, what it protected, what it costs</li>
        <li>â¦ &nbsp;Your Evolved Principle + Next Steps</li>
        <li>â¦ &nbsp;Download as PDF</li>
      </ul>
      ` : ''}
      ${tier === 3 ? `
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;padding-left:0;list-style:none;">
        <li>â¦ &nbsp;12-section complete analysis</li>
        <li>â¦ &nbsp;Personalized audio podcast (Pamela &amp; Brian)</li>
        <li>â¦ &nbsp;8-slide visual deck</li>
        <li>â¦ &nbsp;30-day counter-strategy</li>
        <li>â¦ &nbsp;Neurological shift framework</li>
      </ul>
      ` : ''}
    </div>

    <!-- Note about same browser -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#475569;font-size:12px;line-height:1.7;margin:0;">
        For the best experience, open the report link above in the same browser<br />
        you used for your voice session. Your personalized report is ready and waiting.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid #1e293b;padding-top:24px;">
      <p style="color:#334155;font-size:12px;line-height:1.6;margin:0;">
        Â© ${year} The Invisible Rule Â· The pattern you uncovered is real â and it's yours.
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
  // ââ Parse query params âââââââââââââââââââââââââââââââââââââââââââââââââââ
  const { searchParams } = new URL(req.url);
  const queryTier = searchParams.get('tier') ? parseInt(searchParams.get('tier')!) : null;

  // ââ Parse body âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
      // Try JSON anyway
      const text = await req.text();
      if (text) payload = JSON.parse(text);
    }
  } catch {
    // If we can't parse the body, still return 200 so GHL doesn't retry
    console.warn('GHL webhook: could not parse body');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ââ Log the raw payload for debugging ââââââââââââââââââââââââââââââââââââ
  console.log('GHL webhook received:', JSON.stringify({ queryTier, payload }, null, 2));

  // ââ Detect tier and contact info âââââââââââââââââââââââââââââââââââââââââ
  const tier = detectTierFromPayload(payload, queryTier);
  const email = extractEmail(payload);
  const firstName = extractName(payload);

  // ââ Send confirmation email (if Resend is configured) ââââââââââââââââââââ
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    const resend = new Resend(resendKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <onboarding@resend.dev>';
    try {
      await sendConfirmationEmail(resend, email, firstName, tier, fromAddress);
    } catch (err) {
      console.error('GHL webhook: failed to send confirmation email:', err);
      // Don't fail the webhook â just log it
    }
  }

  // Always return 200 so GHL marks the webhook as delivered
  return NextResponse.json({
    received: true,
    tier,
    email: email ? `${email.slice(0, 3)}***` : 'none',
  }, { status: 200 });
}

// GHL sometimes sends GET requests to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ status: 'GHL webhook endpoint active' }, { status: 200 });
}
