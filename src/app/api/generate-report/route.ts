import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REPORT_GENERATION_PROMPT, FIRST_LIGHT_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';

export const maxDuration = 300; // 5 minutes - needed for Australia + high-latency users

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { sessionState, version, tier }: {
    sessionState: SessionState;
    version: 'A' | 'B';
    tier?: 1 | 2 | 3;
  } = await req.json();

  const messagesText = sessionState.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const hypothesis = sessionState.confirmedHypothesis || sessionState.workingHypothesis;

  // ââ Tier 1: First Light â 2 paragraphs ââââââââââââââââââââââââââââââââââ
  if (tier === 1) {
    const prompt = FIRST_LIGHT_PROMPT({ messages: messagesText, hypothesis });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse First Light report' }, { status: 500 });
    const reportData = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ report: reportData, tier: 1 });
  }

  // ââ Tier 2 & 3: Full report ââââââââââââââââââââââââââââââââââââââââââââââ
  const prompt = REPORT_GENERATION_PROMPT({
    messages: messagesText,
    tolerations: sessionState.tolerations,
    patternData: JSON.stringify(sessionState.patternData, null, 2),
    hypothesis,
    archetype: sessionState.detectedArchetype || 'Not yet determined',
    version,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: version === 'A' ? 3000 : 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse report' }, { status: 500 });

  const reportData = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ report: reportData, version, tier: tier || 2 });
}
