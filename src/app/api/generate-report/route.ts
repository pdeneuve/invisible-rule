import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { REPORT_GENERATION_PROMPT, FIRST_LIGHT_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';

export const maxDuration = 300; // 5 minutes - needed for Australia + high-latency users

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { sessionState, tier }: {
    sessionState: SessionState;
    version?: 'A' | 'B';
    tier?: 1 | 2 | null;
  } = await req.json();

  const messagesText = sessionState.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const hypothesis = sessionState.confirmedHypothesis || sessionState.workingHypothesis;

  // Tier 1 (paid First Light $7) and free users (tier null/undefined) both get First Light
  if (tier === 1 || tier == null) {
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
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse report' }, { status: 500 });

  const reportData = JSON.parse(jsonMatch[0]);

  // Version A aliases: downstream consumers (generate-audio, generate-video,
  // generate-slides) read Version A field names. Add aliases so the Version B
  // Deep Dive content reaches the podcast/video/slides prompts. Only fill if
  // the target key is absent - never overwrite real content.
  if (!reportData.bopStatement && reportData.fullBopHypothesis) {
    reportData.bopStatement = reportData.fullBopHypothesis;
  }
  if (!reportData.whatItProtected && reportData.payoffAndCost) {
    reportData.whatItProtected = reportData.payoffAndCost;
  }
  if (!reportData.costToday && reportData.payoffAndCost) {
    reportData.costToday = reportData.payoffAndCost;
  }
  if (!reportData.evolvedPrinciple && reportData.newOperatingPrinciple) {
    reportData.evolvedPrinciple = reportData.newOperatingPrinciple;
  }
  if (!reportData.nextSteps && reportData.thirtyDayPlan) {
    reportData.nextSteps = reportData.thirtyDayPlan;
  }
  if (!reportData.evidenceSection && reportData.originContext) {
    reportData.evidenceSection = reportData.originContext;
  }
  if (!reportData.tolerationsSummary && reportData.tolerationsMapped) {
    reportData.tolerationsSummary = reportData.tolerationsMapped;
  }

  return NextResponse.json({ report: reportData, version: 'B', tier: 2 });
}
