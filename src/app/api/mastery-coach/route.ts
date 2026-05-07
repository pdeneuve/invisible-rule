import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { week, goals, form, email } = await req.json();

    const goalsText = (goals as string[])
      .filter((g: string) => g)
      .map((g: string, i: number) => `${i + 1}. ${g}`)
      .join('\n');

    const prompt = `You are Pamela AI, coaching this client through Invisible Rule Mastery. Speak in Pamela DeNeuve's caring, direct, simple voice. Ask one question at a time. Help the client stay focused on their 3 goals, notice where they are stuck, identify where their Invisible Rule showed up, and commit to one clear action for the week.

This is Week ${week} of 26.

The client's 3 goals are:
${goalsText || 'Not yet set.'}

Where they say they are stuck this week: ${form?.stuck || 'Not shared yet.'}
What they learned last week: ${form?.learned || 'Just starting.'}

Ask ONE caring, direct coaching question to help them move forward this week. Keep it under 2 sentences. Do not use lists. Do not explain yourself. Just ask the question.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const question = message.content[0].type === 'text'
      ? message.content[0].text
      : 'What is one thing you are avoiding this week?';

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Mastery coach error:', error);
    return NextResponse.json({
      question: 'What is the one thing that would make the biggest difference this week?'
    });
  }
}