import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SLIDES_PROMPT } from '@/lib/deep-dive-prompts';
import { verifyInternalSecret } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { report, firstName } = await req.json();
  if (!report) {
    return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const prompt = SLIDES_PROMPT({
    firstName: firstName || 'Friend',
    bopStatement: report.bopStatement || report.fullBopHypothesis || report.invisibleRule || '',
    tolerations: report.tolerationsSummary || report.tolerationsMapped || '',
    originContext: report.originContext || report.evidenceSection || '',
    whatItProtected: report.whatItProtected || report.payoffAndCost || '',
    costToday: report.costToday || '',
    evolvedPrinciple: report.evolvedPrinciple || report.newOperatingPrinciple || '',
    nextSteps: report.nextSteps || report.thirtyDayPlan || '',
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse slide data' }, { status: 500 });
  }

  const slides = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ slides });
}
