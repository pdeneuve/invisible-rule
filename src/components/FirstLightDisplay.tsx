'use client';

import Link from 'next/link';

interface Props {
  report: Record<string, string>;
  firstName?: string;
}

export default function FirstLightDisplay({ report, firstName }: Props) {
  const name = firstName || 'Friend';
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleShare = async () => {
    const text = [
      'MY INVISIBLE RULE',
      `Prepared for ${name}`,
      '',
      report.invisibleRule || '',
      '',
      'Ã¢ÂÂÃ¢ÂÂ',
      '',
      report.coreInsight || '',
      '',
      'Ã¢ÂÂ The Invisible Rule',
    ].join('\n');

    if (isMobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My Invisible Rule Ã¢ÂÂ First Light', text });
        return;
      } catch { /* fall through */ }
    }
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16 print:bg-white">

      {/* Header */}
      <div className="text-center mb-12 max-w-lg">
        <div className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)', boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}>
          <span className="text-slate-900 font-bold text-sm">IR</span>
        </div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">First Light</p>
        <h1 className="text-3xl font-light text-white mb-3 tracking-tight">
          {firstName ? `${name}, here it is.` : 'Here it is.'}
        </h1>
        <p className="text-slate-500 text-sm">
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Invisible Rule */}
      {report.invisibleRule && (
        <div className="w-full max-w-2xl mb-8 print:mb-6">
          <div
            className="rounded-2xl p-8 print:border print:border-amber-300 print:bg-amber-50"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(180,83,9,0.06))',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4 print:text-amber-700">
              Your Invisible Rule
            </p>
            <p className="text-white text-lg leading-relaxed print:text-slate-900">
              {report.invisibleRule}
            </p>
          </div>
        </div>
      )}

      {/* Core Insight */}
      {report.coreInsight && (
        <div className="w-full max-w-2xl mb-12 print:mb-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 print:bg-slate-50 print:border-slate-200">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4 print:text-slate-600">
              The One Insight That Changes Everything
            </p>
            <p className="text-slate-200 text-base leading-relaxed print:text-slate-800">
              {report.coreInsight}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-2xl space-y-3 print:hidden">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-slate-900 transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 32px rgba(245,158,11,0.25)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {isMobile ? 'Share / Save Report' : 'Download as PDF'}
        </button>

        {/* Upgrade prompt */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-slate-300 font-medium mb-1">Want the full picture?</p>
          <p className="text-slate-500 text-sm mb-4 leading-relaxed">
            The Blueprint maps every layer Ã¢ÂÂ the evidence, what it protected, what it costs today, and your path forward.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_GHL_URL_TIER2 || '/'}
            className="inline-block px-6 py-3 rounded-xl border border-amber-500/40 text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-colors"
          >
            Upgrade to The Blueprint Ã¢ÂÂ $27
          </a>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
            Return to home
          </Link>
        </div>
      </div>

    </div>
  );
}
