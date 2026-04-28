import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { firstName, email, report, tier } = await req.json();

  if (!email || !report) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Pamela DeNeuve <onboarding@resend.dev>';
  const name = firstName || 'Friend';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';

  // Shared styles
  const bodyStyle = 'margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
  const wrapStyle = 'max-width:580px;margin:0 auto;padding:44px 24px;';
  const logoCircle = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:50px;height:50px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;margin:0 auto 12px;">
        <span style="color:#0f172a;font-weight:700;font-size:14px;line-height:50px;display:block;text-align:center;">IR</span>
      </div>
    </div>`;
  const sig = (line: string) => `
    <div style="border-top:1px solid #1e293b;padding-top:24px;margin-top:36px;">
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 6px 0;">${line}</p>
      <p style="color:#94a3b8;font-size:15px;font-weight:500;margin:0;">â Pamela</p>
      <p style="color:#334155;font-size:11px;margin:14px 0 0 0;">Â© ${new Date().getFullYear()} The Invisible Rule</p>
    </div>`;
  const p = (text: string) =>
    `<p style="color:#94a3b8;font-size:15px;line-height:1.85;margin:0 0 18px 0;">${text}</p>`;
  const ruleBlock = (rule: string) => rule ? `
    <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.22);border-radius:14px;padding:26px 28px;margin:28px 0;">
      <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin:0 0 12px 0;">Your Invisible Rule</p>
      <p style="color:#ffffff;font-size:16px;line-height:1.8;margin:0;font-style:italic;">"${rule}"</p>
    </div>` : '';
  const sectionCard = (num: number, title: string, content: string) => `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px 28px;margin-bottom:14px;">
      <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin:0 0 10px 0;">${num} â ${title}</p>
      <p style="color:#cbd5e1;font-size:14px;line-height:1.75;margin:0;white-space:pre-wrap;">${content}</p>
    </div>`;
  const btn = (href: string, label: string) => `
    <div style="text-align:center;margin:28px 0;">
      <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:14px 30px;border-radius:10px;text-decoration:none;">${label}</a>
    </div>`;

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // TIER 1 â FIRST LIGHT
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (tier === 1) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Your First Light Report</title></head>
<body style="${bodyStyle}">
<div style="${wrapStyle}">
  ${logoCircle}
  <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-align:center;margin:0 0 28px 0;">First Light</p>

  <h1 style="color:#ffffff;font-size:22px;font-weight:300;margin:0 0 22px 0;">${name},</h1>

  ${p('I want to share something personal with you before you read this. I was without love for 20 years of my life, and it was finding my own Invisible Rule that finally brought real love back to me.')}
  ${p('I had a client named Gloria. She was a mother and a business owner who felt exhausted no matter how hard she worked. The day she saw her Invisible Rule for the first time, she looked at me and said "I have been trying to earn the right to exist." Her health changed. Her family life changed. It started from that one moment of seeing.')}
  ${p('What is below came from you. Your words. Your memories. Read it slowly.')}

  ${ruleBlock(report.invisibleRule || '')}

  ${report.coreInsight ? `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
    <p style="color:#64748b;font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin:0 0 10px 0;">The One Insight That Changes Everything</p>
    <p style="color:#cbd5e1;font-size:14px;line-height:1.75;margin:0;">${report.coreInsight}</p>
  </div>` : ''}

  ${p(`This is where it starts, ${name}. If you want to know where this rule came from, what it has been costing you, and how to shift it for good, The Blueprint will take you all the way there.`)}

  ${btn(process.env.NEXT_PUBLIC_GHL_URL_TIER2 || appUrl, 'Get The Full Blueprint â $29.97')}

  ${sig('I am proud of the work you did today.')}
</div>
</body>
</html>`;

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `${name}, your Invisible Rule is here`,
        html,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, id: data?.id });
    } catch (err) {
      console.error('Send First Light email error:', err);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  }

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // TIER 2 & 3 â BLUEPRINT / DEEP DIVE
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const tierLabel = tier === 3 ? 'The Deep Dive' : 'The Blueprint';

  const VERSION_A_SECTIONS = [
    { title: 'Your Tolerations',      key: 'tolerationsSummary' },
    { title: 'Repeating Themes',      key: 'repeatingThemesSummary' },
    { title: 'The Evidence',          key: 'evidenceSection' },
    { title: 'What It Protected',     key: 'whatItProtected' },
    { title: 'What It Costs Today',   key: 'costToday' },
    { title: 'Your Evolved Principle',key: 'evolvedPrinciple' },
    { title: 'Your Next Steps',       key: 'nextSteps' },
  ];

  const VERSION_B_SECTIONS = [
    { title: 'Origin Context',                key: 'originContext' },
    { title: 'Your Tolerations Mapped',       key: 'tolerationsMapped' },
    { title: 'First House Pattern Map',       key: 'firstHousePatternMap' },
    { title: 'Memory Theme Analysis',         key: 'memoryThemeAnalysis' },
    { title: 'Archetype Analysis',            key: 'archetypeAnalysis' },
    { title: 'Full Invisible Rule Hypothesis',key: 'fullBopHypothesis' },
    { title: 'Payoff and Cost Analysis',      key: 'payoffAndCost' },
    { title: 'Observation Findings',          key: 'observationFindings' },
    { title: 'Neurological Shift Framework',  key: 'neurologicalShift' },
    { title: 'Your New Operating Principle',  key: 'newOperatingPrinciple' },
    { title: 'Your 30-Day Counter-Strategy',  key: 'thirtyDayPlan' },
    { title: 'Integration and Identity',      key: 'integrationAndIdentity' },
  ];

  const hasVersionB = Boolean(report.originContext || report.fullBopHypothesis || report.thirtyDayPlan);
  const sections = hasVersionB ? VERSION_B_SECTIONS : VERSION_A_SECTIONS;
  const bopStatement = report.bopStatement || report.fullBopHypothesis || '';

  const sectionsHtml = sections
    .filter(s => report[s.key])
    .map((s, i) => sectionCard(i + 1, s.title, report[s.key]))
    .join('');

  const buildShareUrl = () => {
    const profile = {
      firstName: name,
      invisibleRule: bopStatement,
      evolvedPrinciple: report.evolvedPrinciple || report.newOperatingPrinciple || '',
      costToday: report.costToday || '',
      date,
    };
    const encoded = Buffer.from(JSON.stringify(profile), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${appUrl}/share?d=${encoded}`;
  };

  // ââ BLUEPRINT personal note ââââââââââââââââââââââââââââââââââââââ
  const tier2Intro = tier === 2 ? `
  <h1 style="color:#ffffff;font-size:22px;font-weight:300;margin:0 0 22px 0;">${name},</h1>
  ${p('I want to tell you something about myself. I worked hard my whole life and I could never seem to reach my full potential no matter what I did. It was not until I found my own Invisible Rule, in my 70s, that I finally became who I was always meant to be.')}
  ${p('I think of Ralph when I send emails like this one. Ralph was a lawyer who had everything on the outside but felt completely lost on the inside. When he found his Invisible Rule he understood for the first time why he had always stopped himself right before a breakthrough. He made one change and built the life he had always wanted.')}
  ${p('What you have below is your full Blueprint. Read each section. It is the map of how your mind has been working, and how it can work differently.')}
  ` : '';

  // ââ DEEP DIVE personal note + assets ââââââââââââââââââââââââââââ
  const tier3Intro = tier === 3 ? `
  <h1 style="color:#ffffff;font-size:22px;font-weight:300;margin:0 0 22px 0;">${name},</h1>
  ${p('I spent years searching for wealth and I could not understand why it always slipped away. When I found my Invisible Rule, I discovered wealth beyond anything I had believed was possible for me. I had no idea that my own rule had been showing me why all along, and how to finally overcome it.')}
  ${p('Gloria doubled her income and finally started loving her life after she found her rule. Ralph had the most successful year of his career after he found his. They both started exactly where you are right now.')}
  ${p('Everything is below. Use it.')}

  <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:22px 26px;margin:28px 0;">
    <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin:0 0 16px 0;">Your Deep Dive Assets</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(51,65,85,0.5);">
          <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0 0 2px 0;">Your Full Report</p>
          <p style="color:#64748b;font-size:13px;margin:0;">12 sections, read online or download as PDF</p>
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid rgba(51,65,85,0.5);text-align:right;">
          <a href="${appUrl}/processing?tier=3" style="color:#f59e0b;font-size:13px;font-weight:700;text-decoration:none;">Open</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(51,65,85,0.5);">
          <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0 0 2px 0;">Your Audio Podcast</p>
          <p style="color:#64748b;font-size:13px;margin:0;">Pamela and Brian, recorded just for your results</p>
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid rgba(51,65,85,0.5);text-align:right;">
          <a href="${appUrl}/processing?tier=3" style="color:#f59e0b;font-size:13px;font-weight:700;text-decoration:none;">Listen</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(51,65,85,0.5);">
          <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0 0 2px 0;">Your Slide Deck</p>
          <p style="color:#64748b;font-size:13px;margin:0;">8 slides with your key insights</p>
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid rgba(51,65,85,0.5);text-align:right;">
          <a href="${appUrl}/processing?tier=3" style="color:#f59e0b;font-size:13px;font-weight:700;text-decoration:none;">View</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <p style="color:#e2e8f0;font-size:14px;font-weight:500;margin:0 0 2px 0;">Your Shareable Profile</p>
          <p style="color:#64748b;font-size:13px;margin:0;">Share your Invisible Rule with the people in your life</p>
        </td>
        <td style="padding:10px 0 10px 12px;text-align:right;">
          <a href="${buildShareUrl()}" style="color:#f59e0b;font-size:13px;font-weight:700;text-decoration:none;">Share</a>
        </td>
      </tr>
    </table>
  </div>
  ` : '';

  // ââ Blueprint upgrade CTA ââââââââââââââââââââââââââââââââââââââââ
  const upgradeCta = tier === 2 ? `
  <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.16);border-radius:14px;padding:26px;margin:32px 0;text-align:center;">
    <p style="color:#ffffff;font-size:16px;font-weight:400;margin:0 0 10px 0;">Ready to go deeper?</p>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 20px 0;">The Deep Dive includes your personalized audio podcast, a visual slide deck, a shareable profile, and four additional sections including your archetype analysis and your 30-day counter-strategy.</p>
    <a href="${process.env.NEXT_PUBLIC_GHL_URL_TIER3 || appUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;font-weight:700;font-size:14px;padding:14px 30px;border-radius:10px;text-decoration:none;">Get The Deep Dive â $97</a>
  </div>` : '';

  const sigLine = tier === 3
    ? 'I am honored you trusted this process. Now use it.'
    : `I believe in what you started today, ${name}.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Your ${tierLabel}</title></head>
<body style="${bodyStyle}">
<div style="${wrapStyle}">
  ${logoCircle}
  <p style="color:#f59e0b;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-align:center;margin:0 0 28px 0;">${tierLabel}</p>

  ${tier2Intro}
  ${tier3Intro}

  ${ruleBlock(bopStatement)}

  ${sectionsHtml}

  ${upgradeCta}

  ${sig(sigLine)}
</div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: tier === 3
        ? `${name}, The Deep Dive is ready â everything is here`
        : `${name}, The Blueprint is ready â so are you`,
      html,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Send report email error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
