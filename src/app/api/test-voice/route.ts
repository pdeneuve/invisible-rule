import { NextRequest, NextResponse } from 'next/server';
import { isInternalAuthorized } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  if (!isInternalAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
  }

  const { voiceId, text, stability, similarityBoost, style, speed } = await req.json();

  if (!voiceId || !text) {
    return NextResponse.json({ error: 'Missing voiceId or text' }, { status: 400 });
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: stability ?? 0.30,
        similarity_boost: similarityBoost ?? 0.85,
        style: style ?? 0.75,
        use_speaker_boost: true,
        speed: speed ?? 1.0,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `ElevenLabs error: ${errText}` }, { status: 500 });
  }

  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
    },
  });
}
