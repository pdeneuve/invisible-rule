'use client';

import { useState, useRef } from 'react';

const PAMELA_VOICE_ID = 'ZPJulgnHgp8y0rGE6kJ4';
const BRIAN_VOICE_ID  = 'nPczCjzI2devNBz1zQrb';

const PAMELA_SAMPLE = "I want to tell you something. There is a pattern running underneath your life that you have never been able to see clearly. That is what we are going to find together today. And when you find it, everything changes.";
const BRIAN_SAMPLE  = "What Pamela just described is something I have seen transform people over and over again. The moment you see your invisible rule is the moment you stop being driven by it. That moment is right now.";

interface VoiceCardProps {
  name: string;
  voiceId: string;
  defaultText: string;
  defaultSettings: { stability: number; similarityBoost: number; style: number; speed: number };
  color: string;
}

function VoiceCard({ name, voiceId, defaultText, defaultSettings, color }: VoiceCardProps) {
  const [text, setText] = useState(defaultText);
  const [stability, setStability] = useState(defaultSettings.stability);
  const [similarityBoost, setSimilarityBoost] = useState(defaultSettings.similarityBoost);
  const [style, setStyle] = useState(defaultSettings.style);
  const [speed, setSpeed] = useState(defaultSettings.speed);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    try {
      const res = await fetch('/api/test-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text, stability, similarityBoost, style, speed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    setter: (v: number) => void,
    hint: string
  ) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-slate-300 text-xs font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => setter(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <p className="text-slate-600 text-xs mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="rounded-2xl p-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ background: color, color: '#0f172a' }}>
          {name[0]}
        </div>
        <div>
          <p className="text-white font-semibold">{name}</p>
          <p className="text-slate-500 text-xs font-mono">{voiceId}</p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-300 text-sm leading-relaxed resize-none mb-5 focus:outline-none focus:border-amber-500"
        placeholder="Type something for this voice to say..."
      />

      <div className="mb-5">
        {slider('Speed', speed, 0.7, 1.3, 0.05, setSpeed, 'Lower = slower, higher = faster')}
        {slider('Stability', stability, 0.0, 1.0, 0.05, setStability, 'Lower = more expressive, higher = more consistent')}
        {slider('Style', style, 0.0, 1.0, 0.05, setStyle, 'Higher = more personality and emotion')}
        {slider('Similarity', similarityBoost, 0.0, 1.0, 0.05, setSimilarityBoost, 'How closely it matches the original voice')}
      </div>

      <button
        onClick={generate}
        disabled={loading || !text.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
        style={{ background: loading ? '#334155' : color, color: '#0f172a' }}
      >
        {loading ? 'Generating...' : 'Generate Sample'}
      </button>

      {error && (
        <p className="text-red-400 text-xs mt-3 text-center">{error}</p>
      )}

      {audioUrl && (
        <div className="mt-4">
          <audio ref={audioRef} controls src={audioUrl} className="w-full" style={{ accentColor: color }} />
          <p className="text-slate-600 text-xs text-center mt-2">
            Speed {speed} Â· Stability {stability} Â· Style {style} Â· Similarity {similarityBoost}
          </p>
        </div>
      )}
    </div>
  );
}

export default function VoiceTestPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#0f172a' }}>
            IR
          </div>
          <h1 className="text-white text-2xl font-light mb-2">Podcast Voice Tester</h1>
          <p className="text-slate-500 text-sm">Adjust the sliders, generate samples, and find the perfect settings for each voice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <VoiceCard
            name="Pamela"
            voiceId={PAMELA_VOICE_ID}
            defaultText={PAMELA_SAMPLE}
            defaultSettings={{ stability: 0.25, similarityBoost: 0.85, style: 0.90, speed: 1.05 }}
            color="#f59e0b"
          />
          <VoiceCard
            name="Brian"
            voiceId={BRIAN_VOICE_ID}
            defaultText={BRIAN_SAMPLE}
            defaultSettings={{ stability: 0.45, similarityBoost: 0.80, style: 0.60, speed: 1.0 }}
            color="#818cf8"
          />
        </div>

        <div className="rounded-2xl p-6 text-center" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <p className="text-slate-400 text-sm mb-2 font-semibold">When you find the right settings</p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-lg mx-auto">
            Tell me the final numbers for Speed, Stability, Style, and Similarity for each voice and I will update the podcast generator with those exact settings.
          </p>
        </div>

      </div>
    </div>
  );
}
