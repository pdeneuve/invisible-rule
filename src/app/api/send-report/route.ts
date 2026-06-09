import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyInternalSecret } from '@/lib/auth';
import { escapeHtml, safeUrl } from '@/lib/safe-html';
import { isAlreadyFulfilled, markFulfilled, clearFulfilled } from '@/lib/fulfilled-store';

interface SendReportBody {
  firstName?: string;
  email: string;
  report: Record<string, string>;
  tier?: 1 | 2 | null;
  sessionId?: string;
  videoUrl?: string;
  audioUrl?: string;
  slidesUrl?: string;
}

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const body: SendReportBody = await req.json();
  const { firstName, email, report, tier, sessionId, videoUrl, audioUrl, slidesUrl } = body;

  if (!email || !report) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Idempotency: same (email, tier, sessionId) sends at most one email.
  const effectiveTier: 1 | 2 = tier === 2 ? 2 : 1;
  let claimed = false;
  if (sessionId) {
    try {
      if (await isAlreadyFulfilled(email, effectiveTier, sessionId)) {
        console.log(`send-report: already fulfilled for ${email} tier ${effectiveTier} session ${sessionId}`);
        return NextResponse.json({ success: true, idempotent: true });
      }
    } catch (err) {
      console.error('send-report: isAlreadyFulfilled failed:', err);
      return NextResponse.json({ error: 'idempotency-check-failed' }, { status: 503 });
    }
    // Claim before sending so concurrent triggers don't both send.
    try {
      await markFulfilled(email, effectiveTier, sessionId);
      claimed = true;
    } catch (err) {
      console.error('send-report: markFulfilled (claim) failed:', err);
      return NextResponse.json({ error: 'claim-failed' }, { status: 503 });
    }
  }

  const safeName = escapeHtml(firstName || 'Friend');
  // Strip control chars from anything that goes into the Subject header to
  // prevent CR/LF injection of additional headers (BCC etc).
  const subjectName = (firstName || 'Friend').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 80);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <pamela@theinvisiblerule.com>';

  const header = (tierLabel: string) => `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fbbf24,#d97706);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#0f172a;font-weight:700;font-size:16px;">IR</span>
      </div>
      <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 8px;">${tierLabel}</p>
    </div>
  `;

  const p = (text: string) => `<p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px;">${escapeHtml(text)}</p>`;
  const h2 = (text: string) => `<h2 style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">${escapeHtml(text)}</h2>`;
  const section = (title: string, content: string) => `
    <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(51,65,85,0.8);border-radius:16px;padding:24px;margin-bottom:16px;">
      ${h2(title)}
      <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${escapeHtml(content)}</p>
    </div>
  `;

  const btn = (url: string, label: string) => {
    const safe = safeUrl(url);
    if (!safe) return '';
    return `
    <div style="text-align:center;margin:32px 0;">
      <a href="${safe}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">${escapeHtml(label)}</a>
    </div>
  `;
  };

  const sig = (line: string) => `
    <div style="border-top:1px solid rgba(51,65,85,0.5);margin-top:32px;padding-top:24px;">
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">${escapeHtml(line)}</p>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">-- Pamela Deneuve<br>The Invisible Rule</p>
    </div>
  `;

  const wrap = (bodyHtml: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#cbd5e1;">
        <div style="max-width:600px;margin:0 auto;padding:40px 24px;color:#cbd5e1;">
          ${bodyHtml}
        </div>
      </body>
    </html>
  `;

  // Tier 1 (paid First Light $7) and free users (tier null/undefined) get First Light email
  if (effectiveTier === 1) {
    const bop = report.bopStatement || report.invisibleRule || '';
    const context = report.context || report.originContext || '';
    const upgradeUrl = process.env.NEXT_PUBLIC_GHL_URL_TIER2;

    const html = wrap(`
      ${header('First Light Report')}
      <h1 style="color:#ffffff;font-size:28px;font-weight:300;text-align:center;margin:0 0 8px;">${safeName}, here is your Invisible Rule.</h1>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0 0 32px;">${escapeHtml(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</p>

      ${bop ? `
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
        <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px;">Your Invisible Rule</p>
        <p style="color:#ffffff;font-size:18px;line-height:1.6;font-style:italic;margin:0;">&ldquo;${escapeHtml(bop)}&rdquo;</p>
      </div>` : ''}

      ${context ? section('Context', context) : ''}

      ${p('This is the pattern that has been running quietly in the background of your life. Now that you can see it, you can choose differently.')}

      ${upgradeUrl ? `${btn(upgradeUrl, 'Get The Deep Dive')}
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0 0 24px;">Full report, personalized podcast, slides, and a cinematic video walking you through your own pattern.</p>` : ''}

      ${sig('I am proud of the work you just did.')}
    `);

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `${subjectName}, your Invisible Rule is here`,
        html,
      });
      if (error) {
        if (claimed && sessionId) await clearFulfilled(email, 1, sessionId);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: data?.id });
    } catch (err) {
      console.error('Send First Light email error:', err);
      if (claimed && sessionId) await clearFulfilled(email, 1, sessionId);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  }

  // Tier 2 (Deep Dive $97): full report + assets
  const bopStatement = report.bopStatement || report.fullBopHypothesis || '';

  const sectionKeys = [
    { key: 'originContext', title: 'Origin Context' },
    { key: 'tolerationsMapped', title: 'Your Tolerations Mapped' },
    { key: 'firstHousePatternMap', title: 'First House Pattern Map' },
    { key: 'memoryThemeAnalysis', title: 'Memory Theme Analysis' },
    { key: 'archetypeAnalysis', title: 'Archetype Analysis' },
    { key: 'fullBopHypothesis', title: 'Full Invisible Rule Hypothesis' },
    { key: 'payoffAndCost', title: 'Payoff & Cost Analysis' },
    { key: 'observationFindings', title: 'Observation Findings' },
    { key: 'neurologicalShift', title: 'Neurological Shift Framework' },
    { key: 'newOperatingPrinciple', title: 'Your New Operating Principle' },
    { key: 'thirtyDayPlan', title: 'Your 30-Day Counter-Strategy' },
    { key: 'integrationAndIdentity', title: 'Integration & Identity' },
  ];

  const sectionsHtml = sectionKeys
    .filter(s => report[s.key])
    .map(s => section(s.title, report[s.key]))
    .join('');

  const assetLinks: string[] = [];
  if (safeUrl(videoUrl)) assetLinks.push(`<a href="${safeUrl(videoUrl)}" style="color:#f59e0b;text-decoration:none;font-weight:600;">Watch your personalized video</a>`);
  if (safeUrl(audioUrl)) assetLinks.push(`<a href="${safeUrl(audioUrl)}" style="color:#f59e0b;text-decoration:none;font-weight:600;">Listen to your podcast</a>`);
  if (safeUrl(slidesUrl)) assetLinks.push(`<a href="${safeUrl(slidesUrl)}" style="color:#f59e0b;text-decoration:none;font-weight:600;">View your slides</a>`);

  const assetsBlock = assetLinks.length ? `
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px;">Your Deep Dive Assets</p>
      <ul style="margin:0;padding:0;list-style:none;color:#cbd5e1;font-size:14px;line-height:2;">
        ${assetLinks.map(link => `<li>${link}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const html = wrap(`
    ${header('The Deep Dive')}
    <h1 style="color:#ffffff;font-size:28px;font-weight:300;text-align:center;margin:0 0 8px;">${safeName}, here is your Deep Dive.</h1>
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0 0 32px;">${escapeHtml(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))} &middot; The Deep Dive</p>

    ${bopStatement ? `
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px;">Your Invisible Rule</p>
      <p style="color:#ffffff;font-size:18px;line-height:1.6;font-style:italic;margin:0;">&ldquo;${escapeHtml(bopStatement)}&rdquo;</p>
    </div>` : ''}

    ${assetsBlock}
    ${sectionsHtml}
    ${sig('Your full Deep Dive is above. The work starts with noticing - you are already doing it.')}
  `);

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `${subjectName}, your Deep Dive is ready`,
      html,
    });
    if (error) {
      if (claimed && sessionId) await clearFulfilled(email, 2, sessionId);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Send Deep Dive email error:', err);
    if (claimed && sessionId) await clearFulfilled(email, 2, sessionId);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
