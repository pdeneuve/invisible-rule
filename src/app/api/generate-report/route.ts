import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REPORT_GENERATION_PROMPT, FIRST_LIGHT_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';
import { saveSession, getPendingPayment, deletePendingPayment } from '@/lib/session-store';
import { isSameOrigin } from '@/lib/api-auth';

export const maxDuration = 300;

interface RequestBody {
  sessionState: SessionState;
  tier?: 1 | 2 | null;
  firstName?: string;
  email?: string;
  sessionId?: string;
}

function tryParseReport(rawText: string): Record<string, string> | null {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, string>;
  } catch {
    return null;
  }
}

async function persistSessionIfPossible(
  body: RequestBody,
  report: Record<string, string>,
): Promise<void> {
  if (!body.email) return; // Can still return report to caller; just no persistence.
  try {
    const transcriptText = (body.sessionState?.messages || [])
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    await saveSession({
      email: body.email,
      firstName: body.firstName || '',
      sessionId: body.sessionId || '',
      transcript: transcriptText,
      report,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('generate-report: saveSession failed (non-fatal):', err);
  }
}

/**
 * Cross-device recovery (H1): if the customer paid before completing voice
 * (paid on phone, voice on laptop, etc.), the GHL webhook left a paid-pending
 * marker. Now that we have their report saved, trigger fulfillment server-side
 * and clear the marker.
 */
async function tryRecoverPendingPayment(email: string, sessionId: string): Promise<void> {
  try {
    const pending = await getPendingPayment(email);
    if (!pending) return;
    if (pending.tier !== 2) {
      // Tier 1 is just an email; the webhook sent it already. Clear the marker.
      await deletePendingPayment(email);
      return;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://invisible-rule.vercel.app';
    const secret = (process.env.IR_INTERNAL_SECRET || process.env.INTERNAL_FULFILL_SECRET || '').trim();
    await fetch(`${appUrl}/api/fulfill-deep-dive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-IR-Internal-Secret': secret } : {}),
      },
      body: JSON.stringify({
        firstName: pending.firstName,
        email: pending.email,
        sessionId,
        orderId: pending.orderId,
      }),
    });
    await deletePendingPayment(email);
  } catch (err) {
    console.error('tryRecoverPendingPayment failed (non-fatal):', err);
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: RequestBody = await req.json();
  const { sessionState, tier } = body;

  if (!sessionState || !Array.isArray(sessionState.messages)) {
    return NextResponse.json({ error: 'Missing or malformed sessionState' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  const messagesText = sessionState.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
  const hypothesis = sessionState.confirmedHypothesis || sessionState.workingHypothesis;

  try {
    // Tier 1 (paid First Light $7) and free users (tier null/undefined) get First Light
    if (tier === 1 || tier == null) {
      const prompt = FIRST_LIGHT_PROMPT({ messages: messagesText, hypothesis });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      const reportData = tryParseReport(rawText);
      if (!reportData) {
        return NextResponse.json({ error: 'Failed to parse First Light report' }, { status: 502 });
      }
      await persistSessionIfPossible(body, reportData);
      if (body.email && body.sessionId) {
        await tryRecoverPendingPayment(body.email, body.sessionId);
      }
      return NextResponse.json({ report: reportData, tier: tier ?? null });
    }

    // Tier 2 (Deep Dive $97): full multi-section report
    const prompt = REPORT_GENERATION_PROMPT({
      messages: messagesText,
      tolerations: sessionState.tolerations,
      patternData: JSON.stringify(sessionState.patternData, null, 2),
      hypothesis,
      archetype: sessionState.detectedArchetype || 'Not yet determined',
      version: 'B',
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const reportData = tryParseReport(rawText);
    if (!reportData) {
      return NextResponse.json({ error: 'Failed to parse report' }, { status: 502 });
    }
    await persistSessionIfPossible(body, reportData);
    if (body.email && body.sessionId) {
      await tryRecoverPendingPayment(body.email, body.sessionId);
    }
    return NextResponse.json({ report: reportData, version: 'B', tier: 2 });
  } catch (err) {
    console.error('generate-report failed:', err);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 502 });
  }
}
