/**
 * Deep Dive Fulfillment Orchestrator
 *
 * Internal-only endpoint: requires Authorization: Bearer INTERNAL_API_SECRET.
 * Triggered by /api/ghl-webhook (paid Tier 2) and /api/save-session (free flow
 * and pending Tier 2). Generates the full Deep Dive package (audio + slides +
 * video render submission) and emails everything via /api/send-report.
 *
 * Architecture: the heavy work is scheduled via `after()` so this route can
 * respond to the caller quickly (sub-second) while the actual 10-minute
 * fulfillment runs in a continuation that Vercel keeps alive after the
 * response. This is what lets save-session await us without blocking the
 * user's redirect.
 *
 * Idempotency: per (email, tier=2, sessionId). Duplicate triggers short-circuit.
 */

import { NextRequest, NextResponse, after } from 'next/server';
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

async function runFulfillment(body: FulfillRequestBody): Promise<void> {
  const { firstName, email, report, sessionId } = body;
  try {
    const [audioUrl, videoRenderId, slidesUrl] = await Promise.all([
      generateAndUploadAudio(report, firstName),
      submitVideoRender(report, firstName),
      generateAndUploadSlides(report, firstName),
    ]);
    const videoStatusUrl = videoRenderId ? `${appUrl()}/video/${videoRenderId}` : null;
    const emailed = await sendEmail(
      firstName,
      email,
      report,
      sessionId,
      audioUrl,
      videoStatusUrl,
      slidesUrl,
    );
    if (emailed && sessionId) {
      try {
        await markFulfilled(email, 2, sessionId);
      } catch (err) {
        console.error('markFulfilled error (email already sent):', err);
      }
    } else if (!emailed) {
      console.error('Deep Dive: email send failed; not marking fulfilled so retry is possible');
    }
  } catch (err) {
    console.error('runFulfillment error:', err);
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: FulfillRequestBody;
  try {
    body = (await req.json()) as FulfillRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.email || !body.report) {
    return NextResponse.json({ error: 'Missing email or report' }, { status: 400 });
  }

  // Idempotency: same (email, tier 2, sessionId) is only fulfilled once.
  if (body.sessionId && (await isAlreadyFulfilled(body.email, 2, body.sessionId))) {
    console.log(`fulfill-deep-dive: already fulfilled for ${body.email} session ${body.sessionId}`);
    return NextResponse.json({ success: true, idempotent: true });
  }

  // Respond to the caller immediately; do the 10-minute work in a continuation
  // that Vercel keeps alive after the response. This is the only safe pattern
  // for "fire and let it cook" on serverless.
  after(() => runFulfillment(body));

  return NextResponse.json({ success: true, queued: true });
}
