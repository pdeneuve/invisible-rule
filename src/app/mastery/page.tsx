'use client';
import Link from 'next/link';
import { useSearchParams, Suspense } from 'next/navigation';

function MasteryContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start px-6 py-12">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706, #92400e)', boxShadow: '0 0 40px rgba(245,158,11,0.3)' }}
      >
        <span className="text-white text-2xl font-light">IR</span>
      </div>

      <h1 className="text-4xl font-light text-white text-center mb-3">Invisible Rule Mastery</h1>
      <p className="text-amber-400 text-center text-base mb-2 max-w-sm">
        A 26-week AI coaching and accountability experience
      </p>
      <p className="text-slate-400 text-center text-sm mb-8 max-w-sm">
        Stop living by your old rule. Begin practicing your new one.
      </p>

      <div className="w-full max-w-sm bg-slate-800/60 rounded-2xl p-6 mb-8 border border-amber-500/40">
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-4 text-center">What You Get</p>
        {([
          ['📓', '26-week guided workbook path'],
          ['🤖', 'Pamela AI coaching on demand'],
          ['✅', 'Weekly accountability check-ins'],
          ['🔄', 'Every 4-week deep reflection'],
          ['🎯', '3 personal goals from your tolerations'],
          ['💛', 'Support while you practice living differently'],
        ] as [string, string][]).map(([icon, text]) => (
          <div key={text} className="flex items-start gap-3 mb-3">
            <span className="text-lg">{icon}</span>
            <span className="text-slate-300 text-sm">{text}</span>
          </div>
        ))}
      </div>

      <div className="text-center mb-8">
        <div className="flex items-end gap-1 justify-center mb-1">
          <span className="text-5xl font-light text-white">$297</span>
        </div>
        <p className="text-slate-400 text-sm">Full 26-week program</p>
      </div>

      <Link
        href={'/mastery/goals' + (email ? '?email=' + encodeURIComponent(email) : '')}
        className="w-full max-w-sm block text-center py-4 rounded-2xl text-slate-900 font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 mb-4"
        style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}
      >
        Begin My 26-Week Mastery Journey
      </Link>

      <Link href="/" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
        ← Back to home
      </Link>
    </div>
  );
}

export default function MasteryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <MasteryContent />
    </Suspense>
  );
}