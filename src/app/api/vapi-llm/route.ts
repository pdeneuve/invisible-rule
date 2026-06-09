import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { VAPI_BOP_SYSTEM_PROMPT } from '@/lib/vapi-prompt';

// VAPI Custom LLM endpoint â receives messages from VAPI, returns OpenAI-compatible SSE stream
// This lets VAPI handle all voice (STT + TTS) while we handle the AI using our Anthropic key

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const body = await req.json();
  const { messages = [] } = body;

  // Always use the server-side BOP prompt. Any caller-supplied system message
  // is ignored — protects against prompt-injection if VAPI's path is ever
  // tampered with or a different upstream is configured.
  const systemPrompt = VAPI_BOP_SYSTEM_PROMPT.replace(
    '{SESSION_STATE}',
    JSON.stringify({ phase: 'ORIENTATION' }),
  );

  // Filter to only user/assistant messages for Anthropic, and drop any
  // entries with empty content (Anthropic rejects empty text blocks).
  const conversationMessages = messages.filter(
    (m: { role: string; content?: string }) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0
  );

  if (conversationMessages.length === 0) {
    conversationMessages.push({ role: 'user', content: 'Hello' });
  }

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          system: systemPrompt,
          messages: conversationMessages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        });

        let index = 0;

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            // OpenAI-compatible SSE chunk format
            const sseData = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'claude-sonnet-4-5',
              choices: [
                {
                  index,
                  delta: { content: chunk.delta.text },
                  finish_reason: null,
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
            index++;
          }
        }

        // Send final chunk
        const finalData = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-sonnet-4-5',
          choices: [{ index, delta: {}, finish_reason: 'stop' }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('VAPI LLM error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
