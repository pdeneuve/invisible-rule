import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface Body {
  firstName?: string;
  email: string;
  videoUrl: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const { firstName, email, videoUrl }: Body = await req.json();
  if (!email || !videoUrl) {
    return NextResponse.json({ error: 'Missing email or videoUrl' }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || 'The Invisible Rule <onboarding@resend.dev>';
  const name = firstName || 'there';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">${name}, your Deep Dive video is ready</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your personalized Deep Dive video has finished rendering. Watch or download it any time using the link below — it stays available even if you closed the browser tab.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${videoUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;">Watch your video</a>
      </p>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
        Direct link: <a href="${videoUrl}" style="color:#b45309;">${videoUrl}</a>
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: `${name}, your Deep Dive video is ready`,
      html,
    });
    if (error) {
      console.error('send-video-link Resend error:', error);
      return NextResponse.json({ error: 'Email failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-video-link error:', err);
    return NextResponse.json({ error: 'Email failed' }, { status: 500 });
  }
}
