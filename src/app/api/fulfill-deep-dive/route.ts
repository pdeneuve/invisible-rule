/**
 * Deep Dive Fulfillment Orchestrator
 *
 * Generates the full Deep Dive package (report + podcast audio + slides + video)
 * and emails it to the user with all assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/session-store';

export const maxDuration = 300;

interface FulfillRequestBody {
  firstName: string;
  email: string;
  report: Record<string, string>;
  freeToken?: string;
  internalSecret?: string;
  coupon?: string;
  // When called from the First Light → Deep Dive upsell, the client passes
  // the original session so we can regenerate a real tier-2 report that
  // EXPANDS the First Light Invisible Rule rather than producing a new one.
  sessionState?: unknown;
}

const VALID_COUPONS = ['DEEPDIVEGIFT', 'CLIENT2026', 'TESTIMONIAL2026', 'VIPACCESS'];

function isAuthorized(body: FulfillRequestBody): boolean {
  const freeToken = process.env.FREE_DEEP_DIVE_TOKEN || '';
  const internalSecret = process.env.INTERNAL_FULFILL_SECRET || '';
  if (internalSecret && body.internalSecret === internalSecret) return true;
  if (freeToken && body.freeToken === freeToken) return true;
  if (body.coupon && VALID_COUPONS.includes(body.coupon.toUpperCase())) return true;
  return false;
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
    const body: FulfillRequestBody = await req.json();
    const { firstName, email } = body;
    let report = body.report;

    if (!isAuthorized(body)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Server-side recovery: if the browser dropped the report or session
    // (Stripe redirect, fresh tab, cleared localStorage), look the session
    // up by email from our server store and use that as the source of truth.
    let sessionState = body.sessionState;
    if (!report || Object.keys(report).length === 0 || !sessionState) {
      const stored = await getSession(email);
      if (stored) {
        if (!report || Object.keys(report).length === 0) {
          report = (stored.report as Record<string, string>) || {};
        }
        if (!sessionState) {
          sessionState = stored.sessionState;
        }
        console.log('Recovered session from server store for', email);
      }
    }

    if (!report || Object.keys(report).length === 0) {
      return NextResponse.json({ error: 'Missing report and no stored session found' }, { status: 400 });
    }

    // If the report we have is a First Light shape (lacks the 12-section
    // Deep Dive keys), regenerate it as a Deep Dive that EXPANDS the First
    // Light Invisible Rule.
    const looksLikeFirstLight = !report.fullBopHypothesis && !!report.invisibleRule;
    if (sessionState && looksLikeFirstLight) {
      try {
        const regenRes = await fetch(`${appUrl()}/api/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionState,
            tier: 2,
            firstLightAnchor: {
              invisibleRule: report.invisibleRule,
              coreInsight: report.coreInsight,
            },
          }),
        });
        if (regenRes.ok) {
          const json = await regenRes.json();
          if (json?.report) {
            report = json.report;
          } else {
            console.error('Deep Dive regenerate returned no report');
          }
        } else {
          console.error('Deep Dive regenerate failed:', regenRes.status, await regenRes.text());
        }
      } catch (err) {
        console.error('Deep Dive regenerate error:', err);
      }
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
