import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
          return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

  const resend = new Resend(apiKey);
    const { firstName, email, report, tier } = await req.json();

  if (!email || !report) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const name = firstName || 'Friend';
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <pamela@theinvisiblerule.com>';

  // Shared email components
  const header = (tierLabel: string) => `
      <div style="text-align:center;margin-bottom:32px;">
            <div style="width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fbbf24,#d97706);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                    <span style="color:#0f172a;font-weight:700;font-size:16px;">IR</span>
                          </div>
                                <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 8px;">${tierLabel}</p>
                                    </div>
                                      `;

  const p = (text: string) => `<p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px;">${text}</p>`;
    const h2 = (text: string) => `<h2 style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">${text}</h2>`;
    const section = (title: string, content: string) => `
        <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(51,65,85,0.8);border-radius:16px;padding:24px;margin-bottom:16px;">
              ${h2(title)}
                    <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        </div>
                          `;

  const btn = (url: string, label: string) => `
      <div style="text-align:center;margin:32px 0;">
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0f172a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">${label}</a>
                </div>
                  `;

  const sig = (line: string) => `
      <div style="border-top:1px solid rgba(51,65,85,0.5);margin-top:32px;padding-top:24px;">
            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">${line}</p>
                  <p style="color:#64748b;font-size:13px;margin:8px 0 0;">-- Pamela Deneuve<br>The Invisible Rule</p>
                      </div>
                        `;

  const wrap = (body: string) => `
      <!DOCTYPE html>
          <html>
              <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
                            ${body}
                                  </div>
                                      </body>
                                          </html>
                                            `;

  // TIER 1: First Light
  if (tier === 1) {
        const bop = report.bopStatement || report.invisibleRule || '';
        const context = report.context || report.originContext || '';

      const html = wrap(`
            ${header('First Light Report')}
                  <h1 style="color:#ffffff;font-size:28px;font-weight:300;text-align:center;margin:0 0 8px;">${name}, here is your Invisible Rule.</h1>
                        <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 32px;">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>

                              ${bop ? `
                                    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
                                            <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px;">Your Invisible Rule</p>
                                                    <p style="color:#ffffff;font-size:18px;line-height:1.6;font-style:italic;margin:0;">&ldquo;${bop}&rdquo;</p>
                                                          </div>` : ''}

                                                                ${context ? section('Context', context) : ''}

                                                                      ${p('This is the pattern that has been running quietly in the background of your life. Now that you can see it, you can choose differently.')}
                                                                            ${sig('I am proud of the work you just did.')}
                                                                                `);

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

  // TIER 2: Deep Dive
  const tierLabel = 'The Deep Dive';
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

  const upgradeCta = '';

  const sigLine = 'Your full Deep Dive is above. The work starts with noticing - you are already doing it.';

  const html = wrap(`
      ${header(tierLabel)}
          <h1 style="color:#ffffff;font-size:28px;font-weight:300;text-align:center;margin:0 0 8px;">${name}, here is your report.</h1>
              <p style="color:#64748b;font-size:13px;text-align:center;margin:0 0 32px;">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} &middot; ${tierLabel}</p>

                  ${bopStatement ? `
                      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
                            <p style="color:#f59e0b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 16px;">Your Invisible Rule</p>
                                  <p style="color:#ffffff;font-size:18px;line-height:1.6;font-style:italic;margin:0;">&ldquo;${bopStatement}&rdquo;</p>
                                      </div>` : ''}

                                          ${sectionsHtml}
                                              ${upgradeCta}
                                                  ${sig(sigLine)}
                                                    `);

  try {
        const { data, error } = await resend.emails.send({
                from: fromAddress,
                to: email,
                subject: `${name}, The Deep Dive is ready`,
                html,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
        console.error('Send report email error:', err);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
