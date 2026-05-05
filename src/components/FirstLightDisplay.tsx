'use client';
import Link from 'next/link';

interface Props {
  report: Record<string, string>;
  firstName?: string;
}

export default function FirstLightDisplay({ report, firstName }: Props) {
  const name = firstName || 'Friend';
  const bop = report.bopStatement || report.invisibleRule || '';
  const ctx = report.context || report.originContext || '';

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-12">

        <div className="text-center mb-12">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 40% 40%,#fbbf24,#d97706)' }}
          >
            <span className="text-slate-900 font-bold text-lg">IR</span>
          </div>
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">First Light</p>
          <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
            {firstName ? name + ', here it is.' : 'Your Invisible Rule'}
          </h1>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {bop && (
          <div
            className="rounded-2xl p-8 mb-10 text-center"
            style={{
              background: 'linear-gradient(135deg,rgba(245,158,11,0.09),rgba(180,83,9,0.06))',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Your Invisible Rule</p>
            <p className="text-white text-lg leading-relaxed italic">&ldquo;{bop}&rdquo;</p>
          </div>
        )}

        {ctx && (
          <div
            className="rounded-2xl p-8 mb-6"
            style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}
          >
            <h2 className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Context</h2>
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px]">{ctx}</div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:bg-slate-700"
            style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
          >
            Download as PDF
          </button>
          <Link
            href="/"
            className="flex items-center justify-center px-6 py-4 rounded-xl text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            Return to home
          </Link>
        </div>

        <div className="text-center mt-10">
          <p className="text-slate-700 text-xs">&copy; {new Date().getFullYear()} The Invisible Rule</p>
        </div>

      </div>
    </div>
  );
}
