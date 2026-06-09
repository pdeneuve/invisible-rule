import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyBrowserOrigin, rateLimit, getClientIp } from '@/lib/auth';

const MAX_FIELD_LENGTH = 2000;
const MAX_GOAL_LENGTH = 300;
const MAX_GOALS = 5;

function trimField(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, max);
}

export async function POST(req: NextRequest) {
  if (!verifyBrowserOrigin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`mastery-coach:${getClientIp(req)}`, 10)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  try {
    const { week, goals, form } = await req.json();

    const safeGoals = (Array.isArray(goals) ? goals : [])
      .slice(0, MAX_GOALS)
      .map((g: unknown) => trimField(g, MAX_GOAL_LENGTH))
      .filter(Boolean);
    const goalsText = safeGoals
      .map((g, i) => `${i + 1}. ${g}`)
      .join('\n');

    const stuck = trimField(form?.stuck, MAX_FIELD_LENGTH);
    const learned = trimField(form?.learned, MAX_FIELD_LENGTH);
    const safeWeek = Number.isFinite(Number(week)) ? Number(week) : 1;

    const prompt = `You are Pamela AI, coaching this client through Invisible Rule Mastery. Speak in Pamela DeNeuve's caring, direct, simple voice. Ask one question at a time. Help the client stay focused on their 3 goals, notice where they are stuck, identify where their Invisible Rule showed up, and commit to one clear action for the week.

This is Week ${safeWeek} of 26.

The client's 3 goals are:
${goalsText || 'Not yet set.'}

Where they say they are stuck this week: ${stuck || 'Not shared yet.'}
What they learned last week: ${learned || 'Just starting.'}

Ask ONE caring, direct coaching question to help them move forward this week. Keep it under 2 sentences. Do not use lists. Do not explain yourself. Just ask the question.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const question = message.content[0]?.type === 'text'
      ? message.content[0].text
      : 'What is one thing you are avoiding this week?';

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Mastery coach error:', error);
    return NextResponse.json({
      question: 'What is the one thing that would make the biggest difference this week?',
    });
  }
}
