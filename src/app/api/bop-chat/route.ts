import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { BOP_SYSTEM_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';
import { verifyBrowserOrigin, rateLimit, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!verifyBrowserOrigin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`bop-chat:${getClientIp(req)}`, 20)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  const { messages, sessionState }: { messages: Array<{role: string; content: string}>; sessionState: SessionState } = await req.json();

  const systemPromptWithState = BOP_SYSTEM_PROMPT.replace(
    '{SESSION_STATE_JSON}',
    JSON.stringify({
      phase: sessionState.phase,
      phaseProgress: sessionState.phaseProgress,
      tolerations: sessionState.tolerations,
      repeatingThemes: sessionState.repeatingThemes,
      firstHouseMemories: sessionState.firstHouseMemories,
      workingHypothesis: sessionState.workingHypothesis,
      confirmedHypothesis: sessionState.confirmedHypothesis,
      detectedArchetype: sessionState.detectedArchetype,
      confidenceScore: sessionState.confidenceScore,
      leadCaptured: sessionState.leadCaptured,
    }, null, 2)
  );

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPromptWithState,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
