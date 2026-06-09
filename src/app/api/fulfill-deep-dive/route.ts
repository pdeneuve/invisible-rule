/**
 * Deep Dive Fulfillment Orchestrator
 *
 * Internal-only endpoint: requires Authorization: Bearer INTERNAL_API_SECRET.
 * Triggered by /api/ghl-webhook (paid Tier 2) and /api/save-session (free flow
 * and pending Tier 2). Generates the full Deep Dive package (audio + slides +
 * video render submission) and emails everything via /api/send-report.
 *
 * Idempotency: per (email, tier=2, sessionId). Duplicate triggers short-circuit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import { verifyInternalSecret, internalAuthHeader } from '@/lib/auth';
import { isAlreadyFulfilled, markFulfilled } from '@/lib/fulfilled-store';

export const maxDuration = 300;

interface FulfillRequestBody {
  firstName: string;
  email: string;
  report: Record<string, string>;
  sessionId?: string;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

function randomSuffix(): string {
  return crypto.randomBytes(12).toString('hex');
}

async function generateAndUploadAudio(
  report: Record<string, string>,
  firstName: string,
): Promise<string | null> {
  const auth = internalAuthHeader();
  if (!auth) return null;
  try {
    const res = await fetch(`${appUrl()}/api/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ report, firstName }),
    });
    if (!res.ok) {
      console.error('generate-audio failed:', res.status, await res.text());
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = `podcasts/${Date.now()}-${randomSuffix()}.mp3`;
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
  firstName: string,
): Promise<string | null> {
  const auth = internalAuthHeader();
  if (!auth) return null;
  try {
    const res = await fetch(`${appUrl()}/api/generate-slides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ report, firstName }),
    });
    if (!res.ok) {
      console.error('generate-slides failed:', res.status, await res.text());
      return null;
    }
    const { slides } = await res.json();
    if (!slides) return null;
    const filename = `slides/${Date.now()}-${randomSuffix()}.json`;
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
  firstName: string,
): Promise<string | null> {
  const auth = internalAuthHeader();
  if (!auth) return null;
  try {
    const res = await fetch(`${appUrl()}/api/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
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
  sessionId: string | undefined,
  audioUrl: string | null,
  videoUrl: string | null,
  slidesUrl: string | null,
): Promise<boolean> {
  const auth = internalAuthHeader();
  if (!auth) return false;
  try {
    const res = await fetch(`${appUrl()}/api/send-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        firstName,
        email,
        report,
        tier: 2,
        sessionId,
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
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { firstName, email, report, sessionId }: FulfillRequestBody = await req.json();

    if (!email || !report) {
      return NextResponse.json({ error: 'Missing email or report' }, { status: 400 });
    }

    // Idempotency: same (email, tier 2, sessionId) is only fulfilled once.
    if (sessionId && (await isAlreadyFulfilled(email, 2, sessionId))) {
      console.log(`fulfill-deep-dive: already fulfilled for ${email} session ${sessionId}`);
      return NextResponse.json({ success: true, idempotent: true });
    }

    const [audioUrl, videoRenderId, slidesUrl] = await Promise.all([
      generateAndUploadAudio(report, firstName),
      submitVideoRender(report, firstName),
      generateAndUploadSlides(report, firstName),
    ]);

    const videoStatusUrl = videoRenderId ? `${appUrl()}/video/${videoRenderId}` : null;

    const emailed = await sendEmail(firstName, email, report, sessionId, audioUrl, videoStatusUrl, slidesUrl);

    if (!emailed) {
      // The email is the deliverable; if it failed, surface the error so the
      // caller (webhook or save-session) can retry.
      return NextResponse.json(
        { success: false, error: 'email-send-failed', audioUrl, videoRenderId, slidesUrl },
        { status: 500 },
      );
    }

    if (sessionId) await markFulfilled(email, 2, sessionId);

    return NextResponse.json({
      success: true,
      audioUrl,
      videoRenderId,
      videoStatusUrl,
      slidesUrl,
      degraded: !audioUrl || !videoRenderId || !slidesUrl,
    });
  } catch (err) {
    console.error('fulfill-deep-dive error:', err);
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
