import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { BOP_SYSTEM_PROMPT } from '@/lib/bop-system-prompt';
import { SessionState } from '@/lib/types';

export async function POST(req: NextRequest) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

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

  // Anthropic rejects messages with empty text content blocks. Drop any
  // message whose content is empty/whitespace (e.g. a placeholder assistant
  // message left over from a failed stream, or an empty user submission).
  const sanitizedMessages = messages
    .filter(m => typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  if (sanitizedMessages.length === 0) {
    return Response.json(
      { error: 'No non-empty messages provided' },
      { status: 400 }
    );
  }

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPromptWithState,
    messages: sanitizedMessages,
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
