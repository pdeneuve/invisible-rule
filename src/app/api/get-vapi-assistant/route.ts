import { NextResponse } from 'next/server';
import { VAPI_BOP_SYSTEM_PROMPT } from '@/lib/vapi-prompt';

export async function GET() {
  // If a fixed assistant ID is stored in env, always use it â no creation needed.
  // This is the most reliable approach: one assistant, updated via PATCH when needed.
  const fixedId = (process.env.VAPI_ASSISTANT_ID || '').trim();
  if (fixedId) {
    return NextResponse.json({ assistantId: fixedId });
  }

  // Fallback: create a new assistant if no fixed ID is set (first-time setup)

  const privateKey = process.env.VAPI_PRIVATE_KEY;
  if (!privateKey || privateKey === 'your_vapi_private_key_here') {
    return NextResponse.json({ error: 'VAPI_PRIVATE_KEY not configured' }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 });
  }

  const systemPrompt = VAPI_BOP_SYSTEM_PROMPT.replace(
    '{SESSION_STATE}',
    JSON.stringify({ phase: 'ORIENTATION' })
  );

  try {
    // Create (or recreate) the assistant via VAPI REST API
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Invisible Rule Guide',
        model: {
          provider: 'custom-llm',
          url: `${appUrl}/api/vapi-llm`,
          model: 'claude-sonnet-4-5',
          messages: [
            { role: 'system', content: systemPrompt },
          ],
          temperature: 0.7,
          maxTokens: 300,
        },
        voice: {
          provider: '11labs',
          voiceId: 'ZPJulgnHgp8y0rGE6kJ4', // Pamela's cloned voice
        },
        firstMessage: "Welcome. I'm Pamela DeNeuve, and I'm so glad you're here. In the next hour, we're going to find the invisible pattern that's been running your life on autopilot. Before we begin, I want to check in with you. On a scale of 0 to 10, where 0 is completely calm and 10 is the most overwhelmed you've ever felt, where are you emotionally right now?",
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en-US',
        },
        silenceTimeoutSeconds: 300, // 5 minutes â people need time to think
        maxDurationSeconds: 7200,   // 2 hours
        endCallFunctionEnabled: false, // never let AI end the call early
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('VAPI assistant creation failed:', data);
      return NextResponse.json(
        { error: 'Failed to create VAPI assistant', details: data },
        { status: 500 }
      );
    }

    console.log('Created VAPI assistant:', data.id, 'â set VAPI_ASSISTANT_ID='+data.id+' in Vercel env to lock this in permanently');
    return NextResponse.json({ assistantId: data.id });

  } catch (error) {
    console.error('Error creating VAPI assistant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
