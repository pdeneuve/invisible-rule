import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { VAPI_BOP_SYSTEM_PROMPT } from '@/lib/vapi-prompt';
import { rateLimit, getClientIp, verifyVapiSecret } from '@/lib/auth';

// VAPI custom-LLM endpoint. VAPI is configured with baseURL = /api/vapi-llm
// and appends /chat/completions; this file is what actually serves live calls.

export async function POST(req: NextRequest) {
  if (!verifyVapiSecret(req)) {
    // Light rate limit on unauthorized hits so this can't be enumerated as a
    // free Claude proxy.
    rateLimit(`vapi-llm-cc-unauth:${getClientIp(req)}`, 3);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }
  const client = new Anthropic({ apiKey });

  const body = await req.json();
  const { messages = [], stream: shouldStream = true } = body;

  const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
  const systemPrompt = systemMessage?.content ||
    VAPI_BOP_SYSTEM_PROMPT.replace('{SESSION_STATE}', JSON.stringify({ phase: 'ORIENTATION' }));

  const conversationMessages = messages.filter(
    (m: { role: string }) => m.role === 'user' || m.role === 'assistant',
  );

  if (conversationMessages.length === 0) {
    conversationMessages.push({ role: 'user', content: 'Hello' });
  }

  if (!shouldStream) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: systemPrompt,
      messages: conversationMessages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return Response.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'claude-sonnet-4-5',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      }],
    });
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
            const sseData = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'claude-sonnet-4-5',
              choices: [{
                index,
                delta: { role: 'assistant', content: chunk.delta.text },
                finish_reason: null,
              }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
            index++;
          }
        }

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
    },
  });
}
