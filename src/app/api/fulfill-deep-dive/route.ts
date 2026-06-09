/**
 * Deep Dive Fulfillment Orchestrator
 *
 * Generates the full Deep Dive package (report + podcast audio + slides + video)
 * and emails it to the user with all assets.
 *
 * Two ways to authorize:
 *   - X-IR-Internal-Secret header (server-to-server, e.g. from /api/ghl-webhook)
 *   - freeToken in body matching FREE_DEEP_DIVE_TOKEN env (existing-client free flow)
 *
 * The request body may include either the full `report` or a `sessionId` we can
 * look the report up by — the latter avoids the 64KB browser-keepalive limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isInternalAuthorized } from '@/lib/api-auth';
import { getSession } from '@/lib/session-store';
import { claimOrder, releaseOrder } from '@/lib/idempotency';

export const maxDuration = 300;

interface FulfillRequestBody {
  firstName?: string;
  email: string;
  report?: Record<string, string>;
  sessionId?: string;
  orderId?: string;
  freeToken?: string;
}

function isAuthorized(req: NextRequest, body: FulfillRequestBody): boolean {
  if (isInternalAuthorized(req)) return true;
  const freeToken = (process.env.FREE_DEEP_DIVE_TOKEN || '').trim();
  if (freeToken && body.freeToken === freeToken) return true;
  return false;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

function internalSecret(): string {
  return (process.env.IR_INTERNAL_SECRET || process.env.INTERNAL_FULFILL_SECRET || '').trim();
}

function internalHeaders(): Record<string, string> {
  const s = internalSecret();
  return {
    'Content-Type': 'application/json',
    ...(s ? { 'X-IR-Internal-Secret': s } : {}),
  };
}

async function generateAndUploadAudio(
  report: Record<string, string>,
  firstName: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-audio`, {
      method: 'POST',
      headers: internalHeaders(),
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
  firstName: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-slides`, {
      method: 'POST',
      headers: internalHeaders(),
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
  firstName: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl()}/api/generate-video`, {
      method: 'POST',
      headers: internalHeaders(),
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
  slidesUrl: string | null,
): Promise<boolean> {
  try {
    const res = await fetch(`${appUrl()}/api/send-report`, {
      method: 'POST',
      headers: internalHeaders(),
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
  let body: FulfillRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
  }

  if (!isAuthorized(req, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, sessionId } = body;
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  // Resolve the report. Prefer a body-supplied report (kept for backward
  // compat); otherwise look it up via sessionId/email from the session store.
  let report = body.report;
  let firstName = body.firstName || '';
  if (!report) {
    const stored = await getSession(email);
    if (!stored || !stored.report) {
      return NextResponse.json(
        { error: 'No saved session for this email; cannot fulfill yet' },
        { status: 409 },
      );
    }
    if (sessionId && stored.sessionId && sessionId !== stored.sessionId) {
      return NextResponse.json(
        { error: 'sessionId does not match the saved session' },
        { status: 409 },
      );
    }
    report = stored.report;
    firstName = firstName || stored.firstName || '';
  }

  // Idempotency: if an orderId is provided, claim it. Re-entries return success
  // without re-running the expensive pipeline (no duplicate emails, no duplicate
  // ElevenLabs/Anthropic/Creatomate spend).
  const orderId = (body.orderId || '').trim();
  if (orderId) {
    const claimed = await claimOrder(orderId);
    if (!claimed) {
      return NextResponse.json(
        { success: true, deduped: true, message: 'Order already fulfilled' },
        { status: 200 },
      );
    }
  }

  try {
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
    // Release the claim so a retry can re-run.
    if (orderId) await releaseOrder(orderId);
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
