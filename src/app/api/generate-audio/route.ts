import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { PODCAST_SCRIPT_PROMPT } from '@/lib/deep-dive-prompts';

// Allow up to 5 minutes — audio generation takes time
export const maxDuration = 300;

const PAMELA_VOICE_ID = 'ZPJulgnHgp8y0rGE6kJ4';
const BRIAN_VOICE_ID = 'nPczCjzI2devNBz1zQrb';

const VOICE_SETTINGS: Record<string, object> = {
  pamela: {
    stability: 0.25,
    similarity_boost: 0.85,
    style: 0.9,
    use_speaker_boost: true,
  },
  brian: {
    stability: 0.45,
    similarity_boost: 0.80,
    style: 0.6,
    use_speaker_boost: true,
  },
};

async function generateSegmentAudio(
  text: string,
  speaker: 'pamela' | 'brian',
  apiKey: string
): Promise<ArrayBuffer> {
  const voiceId = speaker === 'pamela' ? PAMELA_VOICE_ID : BRIAN_VOICE_ID;
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
      voice_settings: VOICE_SETTINGS[speaker],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs error (${res.status}): ${errText}`);
  }

  return res.arrayBuffer();
}

export async function POST(req: NextRequest) {
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenlabsKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { report, firstName } = await req.json();

  if (!report) {
    return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
  }

  // ── Step 1: Generate podcast script with Claude ─────────────────────────
  const client = new Anthropic({ apiKey: anthropicKey });

  const scriptPrompt = PODCAST_SCRIPT_PROMPT({
    firstName: firstName || 'Friend',
    bopStatement: report.bopStatement || report.fullBopHypothesis || report.invisibleRule || '',
    whatItProtected: report.whatItProtected || report.payoffAndCost || '',
    costToday: report.costToday || '',
    evolvedPrinciple: report.evolvedPrinciple || report.newOperatingPrinciple || '',
    originSummary: report.originContext || report.evidenceSection || '',
  });

  const scriptResponse = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: scriptPrompt }],
  });

  const rawScript = scriptResponse.content[0].type === 'text' ? scriptResponse.content[0].text : '';
  const jsonMatch = rawScript.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse podcast script' }, { status: 500 });
  }

  const script: Array<{ speaker: 'pamela' | 'brian'; text: string }> = JSON.parse(jsonMatch[0]);

  // ── Step 2: Generate audio for each segment sequentially ───────────────
  const audioBuffers: ArrayBuffer[] = [];

  for (const segment of script) {
    const buffer = await generateSegmentAudio(segment.text, segment.speaker, elevenlabsKey);
    audioBuffers.push(buffer);
  }

  // ── Step 3: Concatenate all MP3 buffers ─────────────────────────────────
  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // ── Step 4: Return the audio as MP3 + the script as a header ───────────
  return new Response(combined, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="invisible-rule-deep-dive.mp3"`,
      'X-Script': encodeURIComponent(JSON.stringify(script.map(s => s.text))),
    },
  });
}
