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

/**
 * Sync auth check — passes if EITHER a valid internal secret OR a valid
 * free token is provided. Coupon-based auth requires a stored session
 * lookup, so it is handled separately (async) inside POST.
 */
function isInternallyAuthorized(body: FulfillRequestBody): boolean {
  const freeToken = process.env.FREE_DEEP_DIVE_TOKEN || '';
  const internalSecret = process.env.INTERNAL_FULFILL_SECRET || '';
  if (internalSecret && body.internalSecret === internalSecret) return true;
  if (freeToken && body.freeToken === freeToken) return true;
  return false;
}

function normalizedCoupon(raw: string | undefined): string {
  return String(raw ?? '').trim().toUpperCase();
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
}

/**
 * fetch with an explicit timeout. Without this, a hanging upstream call
 * can keep fulfill-deep-dive blocked until it hits its 5-minute function
 * timeout, and the email never gets sent. Returns null if the call hangs
 * past `ms`.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    console.error(`fetchWithTimeout aborted/failed for ${url} after ${ms}ms:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function generateAndUploadAudio(
  report: Record<string, string>,
  firstName: string
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${appUrl()}/api/generate-audio`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      },
      120_000
    );
    if (!res || !res.ok) {
      console.error('generate-audio failed:', res?.status, res ? await res.text() : 'timeout');
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
    const res = await fetchWithTimeout(
      `${appUrl()}/api/generate-slides`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      },
      90_000
    );
    if (!res || !res.ok) {
      console.error('generate-slides failed:', res?.status, res ? await res.text() : 'timeout');
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
    // Video render needs time to generate 8 ElevenLabs narration clips
    // before submitting to Creatomate. Allow up to 180s. The regenerate
    // step runs in parallel at up to 240s, so this does not extend the
    // overall pipeline.
    const res = await fetchWithTimeout(
      `${appUrl()}/api/generate-video`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      },
      180_000
    );
    if (!res || !res.ok) {
      console.error('generate-video failed:', res?.status, res ? await res.text() : 'timeout');
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
    const res = await fetchWithTimeout(
      `${appUrl()}/api/send-report`,
      {
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
      },
      60_000
    );
    if (!res || !res.ok) {
      console.error('send-report failed:', res?.status, res ? await res.text() : 'timeout');
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

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // ── Auth ────────────────────────────────────────────────────────
    // Path 1: internal secret / free token (already valid — trusted callers)
    let authorized = isInternallyAuthorized(body);
    let couponUsed = '';

    // Path 2: coupon. This is what attackers try to abuse. To prove the
    // caller isn't just spraying our coupon at random emails, we require
    // that a voice session has already been stored on our server for
    // that email. Legitimate users always have this because
    // save-session runs at the end of every voice session; random
    // attackers with only a coupon and someone else's email cannot
    // clear this bar.
    let storedForAuth: Awaited<ReturnType<typeof getSession>> = null;
    if (!authorized) {
      const c = normalizedCoupon(body.coupon);
      if (c && VALID_COUPONS.includes(c)) {
        storedForAuth = await getSession(email);
        if (storedForAuth) {
          authorized = true;
          couponUsed = c;
        } else {
          return NextResponse.json(
            {
              error: 'Coupon requires a completed voice session for this email.',
              hint: 'Complete a voice session with this email address first.',
            },
            { status: 401 }
          );
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side recovery: if the browser dropped the report or session
    // (Stripe redirect, fresh tab, cleared localStorage), look the session
    // up by email from our server store and use that as the source of truth.
    let sessionState = body.sessionState;
    if (!report || Object.keys(report).length === 0 || !sessionState) {
      // Reuse the storedForAuth lookup if we already made it above.
      const stored = storedForAuth ?? (await getSession(email));
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

    // The Deep Dive email template renders 12 Version B keys. If any are
    // missing, regenerate as Deep Dive (tier 2) anchored to the First
    // Light Invisible Rule so the same statement carries through.
    // We check the two most-signal keys — if either is missing we treat
    // the report as needing regen. This catches:
    //  - First Light shape (has invisibleRule, missing everything else)
    //  - Version A shape (has bopStatement/evidenceSection, missing V-B keys)
    //  - Any partial/malformed Version B response
    const hasFullDeepDive = !!report.fullBopHypothesis && !!report.originContext;
    if (sessionState && !hasFullDeepDive) {
      try {
        // Choose the best anchor we have so regen can lock onto it
        const anchorInvisibleRule =
          report.invisibleRule ||
          report.fullBopHypothesis ||
          report.bopStatement ||
          '';
        const anchorInsight = report.coreInsight || '';
        const regenRes = await fetchWithTimeout(`${appUrl()}/api/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionState,
            tier: 2,
            firstLightAnchor: anchorInvisibleRule
              ? { invisibleRule: anchorInvisibleRule, coreInsight: anchorInsight }
              : undefined,
          }),
        }, 240_000); // 4 minutes — Deep Dive prompt + Anthropic can take a while
        if (regenRes && regenRes.ok) {
          const json = await regenRes.json();
          if (json?.report) {
            report = json.report;
          } else {
            console.error('Deep Dive regenerate returned no report');
          }
        } else if (regenRes) {
          console.error('Deep Dive regenerate failed:', regenRes.status, await regenRes.text());
        } else {
          console.error('Deep Dive regenerate timed out');
        }
      } catch (err) {
        console.error('Deep Dive regenerate error:', err);
      }
    }

    // Last-resort defense: after regen attempt, if the Deep Dive Version B
    // keys are STILL missing, synthesize them from whatever content we
    // have (First Light invisibleRule/coreInsight, OR Version A bopStatement/
    // evidenceSection/etc). Guarantees the email is never empty regardless
    // of what shape the stored report was in.
    if (!report.fullBopHypothesis || !report.originContext) {
      console.warn('Falling back to available content for Deep Dive email');
      const bop =
        report.fullBopHypothesis ||
        report.invisibleRule ||
        report.bopStatement ||
        '';
      const context =
        report.originContext ||
        report.evidenceSection ||
        report.coreInsight ||
        '';
      const protectedContent =
        report.payoffAndCost ||
        report.whatItProtected ||
        '';
      const evolvedContent =
        report.newOperatingPrinciple ||
        report.evolvedPrinciple ||
        '';
      const nextStepsContent =
        report.thirtyDayPlan ||
        report.nextSteps ||
        '';
      const tolerationsContent =
        report.tolerationsMapped ||
        report.tolerationsSummary ||
        '';

      report.fullBopHypothesis = report.fullBopHypothesis || bop;
      report.bopStatement = report.bopStatement || bop;
      report.originContext = report.originContext || context;
      report.tolerationsMapped = report.tolerationsMapped || tolerationsContent;
      report.payoffAndCost = report.payoffAndCost || protectedContent;
      report.newOperatingPrinciple = report.newOperatingPrinciple || evolvedContent;
      report.thirtyDayPlan = report.thirtyDayPlan || nextStepsContent;
      report.integrationAndIdentity = report.integrationAndIdentity || evolvedContent;
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
      couponUsed: couponUsed || undefined,
    });
  } catch (err) {
    console.error('fulfill-deep-dive error:', err);
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
  }
}
