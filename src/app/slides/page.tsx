'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Slide {
  title?: string;
  heading?: string;
  content?: string;
  body?: string;
  text?: string;
  subtitle?: string;
}

interface SlideData {
  slides: Slide[];
  firstName?: string;
}

function SlidesContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [data, setData] = useState<SlideData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!url) {
      setError('No slides specified.');
      return;
    }
    let cancelled = false;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load slides: ${r.status}`);
        return r.json();
      })
      .then((json: SlideData) => {
        if (cancelled) return;
        setData(json);
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const slides = data.slides || [];
  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">No slides available.</p>
      </div>
    );
  }

  const slide = slides[index];
  const title = slide.title || slide.heading || `Slide ${index + 1}`;
  const subtitle = slide.subtitle || '';
  const body = slide.content || slide.body || slide.text || '';

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(slides.length - 1, i + 1));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
          {data.firstName ? `${data.firstName}'s Deep Dive` : 'The Invisible Rule'} &middot; Slide {index + 1} of {slides.length}
        </p>
        <div
          className="rounded-2xl p-10 md:p-14 min-h-[60vh] flex flex-col justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.09), rgba(180,83,9,0.06))',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <h1 className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-amber-400 text-sm font-medium uppercase tracking-widest mb-6">{subtitle}</p>
          )}
          <p className="text-slate-200 text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{body}</p>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-colors"
          >
            &larr; Previous
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-amber-400' : 'bg-slate-700 hover:bg-slate-600'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={index === slides.length - 1}
            className="px-6 py-3 rounded-xl text-slate-900 font-semibold disabled:opacity-30 transition-all"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 8px 24px rgba(245,158,11,0.25)',
            }}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SlidesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SlidesContent />
    </Suspense>
  );
}
