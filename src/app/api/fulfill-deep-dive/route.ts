/**
 * Deep Dive Fulfillment Orchestrator
 *
 * Generates the full Deep Dive package (report + podcast audio + slides + video)
 * and emails it to the user with all assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const maxDuration = 300;

interface FulfillRequestBody {
  firstName: string;
  email: string;
  report: Record<string, string>;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

async function generateAndUploadAudio(
  report: Record<string, string>,
  firstName: string
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, firstName }),
    });
    if (!res.ok) {
      console.error('generate-audio failed:', res.status, await res.text());
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = `podcasts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
    const blob = await put(filename, buf, {
      access: 'public',
      contentType: 'audio/mpeg',
    });
    return blob.url;
  } catch (err) {
    console.error('generateAndUploadAudio error:', err);
    return null;
  }
}

async function generateAndUploadSlides(
  report: Record<string, string>,
  firstName: string
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-slides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, firstName }),
    });
    if (!res.ok) {
      console.error('generate-slides failed:', res.status, await res.text());
      return null;
    }
    const { slides } = await res.json();
    if (!slides) return null;
    const filename = `slides/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    const blob = await put(filename, JSON.stringify({ slides, firstName }), {
      access: 'public',
      contentType: 'application/json',
    });
    return `${appUrl()}/slides?url=${encodeURIComponent(blob.url)}`;
  } catch (err) {
    console.error('generateAndUploadSlides error:', err);
    return null;
  }
}

async function submitVideoRender(
  report: Record<string, string>,
  firstName: string
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report, firstName }),
    });
    if (!res.ok) {
      console.error('generate-video failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.renderId || data.id || null;
  } catch (err) {
    console.error('submitVideoRender error:', err);
    return null;
  }
}

async function sendEmail(
  firstName: string,
  email: string,
  report: Record<string, string>,
  audioUrl: string | null,
  videoUrl: string | null,
  slidesUrl: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`${appUrl()}/api/send-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        email,
        report,
        tier: 2,
        audioUrl: audioUrl || undefined,
        videoUrl: videoUrl || undefined,
        slidesUrl: slidesUrl || undefined,
      }),
    });
    if (!res.ok) {
      console.error('send-report failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEmail error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, email, report }: FulfillRequestBody = await req.json();

    if (!email || !report) {
      return NextResponse.json({ error: 'Missing email or report' }, { status: 400 });
    }

    const [audioUrl, videoRenderId, slidesUrl] = await Promise.all([
      generateAndUploadAudio(report, firstName),
      submitVideoRender(report, firstName),
      generateAndUploadSlides(report, firstName),
    ]);

    const videoStatusUrl = videoRenderId ? `${appUrl()}/video/${videoRenderId}` : null;

    const emailed = await sendEmail(firstName, email, report, audioUrl, videoStatusUrl, slidesUrl);

    return NextResponse.json({
      success: true,
      audioUrl,
      videoRenderId,
      videoStatusUrl,
      slidesUrl,
      emailed,
    });
  } catch (err) {
    console.error('fulfill-deep-dive error:', err);
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
