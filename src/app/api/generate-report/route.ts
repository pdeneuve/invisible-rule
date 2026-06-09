import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REPORT_GENERATION_PROMPT, FIRST_LIGHT_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';
import { verifyOriginOrSameSite, rateLimit, getClientIp } from '@/lib/auth';

export const maxDuration = 300; // 5 minutes - needed for Australia + high-latency users

function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyOriginOrSameSite(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`generate-report:${getClientIp(req)}`, 6)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  const { sessionState, tier }: {
    sessionState: SessionState;
    version?: 'A' | 'B';
    tier?: 1 | 2 | null;
  } = await req.json();

  if (!sessionState || !Array.isArray(sessionState.messages)) {
    return NextResponse.json({ error: 'invalid sessionState' }, { status: 400 });
  }

  const messagesText = sessionState.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const hypothesis = sessionState.confirmedHypothesis || sessionState.workingHypothesis;

  // Tier 1 (paid First Light $7) and free users (tier null/undefined) both get First Light
  if (tier === 1 || tier == null) {
    const prompt = FIRST_LIGHT_PROMPT({ messages: messagesText, hypothesis });
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('First Light: no JSON in response:', rawText.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse First Light report' }, { status: 502 });
      }
      const reportData = safeJsonParse<Record<string, string>>(jsonMatch[0]);
      if (!reportData) {
        return NextResponse.json({ error: 'Malformed First Light JSON' }, { status: 502 });
      }
      return NextResponse.json({ report: reportData, tier: tier ?? null });
    } catch (err) {
      console.error('First Light generation error:', err);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }
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

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Deep Dive: no JSON in response:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse report' }, { status: 502 });
    }
    const reportData = safeJsonParse<Record<string, string>>(jsonMatch[0]);
    if (!reportData) {
      return NextResponse.json({ error: 'Malformed Deep Dive JSON' }, { status: 502 });
    }
    return NextResponse.json({ report: reportData, version: 'B', tier: 2 });
  } catch (err) {
    console.error('Deep Dive generation error:', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }
}
