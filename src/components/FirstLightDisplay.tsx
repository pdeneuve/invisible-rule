'use client';

import Link from 'next/link';

interface Props {
    report: Record<string, string>;
    firstName?: string;
}

export default function FirstLightDisplay({ report, firstName }: Props) {
    const name = firstName || 'Friend';
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const bopStatement = report.bopStatement || report.invisibleRule || '';
    const context = report.context || report.originContext || '';

  const handleDownload = async () => {
        if (isMobile && typeof navigator.share === 'function') {
                try {
                          await navigator.share({
                                      title: 'My Invisible Rule - First Light',
                                      text: [
                                                    'FIRST LIGHT - MY INVISIBLE RULE',
                                                    `Prepared for ${name}`,
                                                    '',
                                                    bopStatement ? `"${bopStatement}"` : '',
                                                    '',
                                                    context ? `CONTEXT\n${context}` : '',
                                                    '',
                                                    '-- The Invisible Rule',
                                                  ].join('\n'),
                          });
                          return;
                } catch { /* fall through to print */ }
        }
        window.print();
  };

  return (
        <div className="min-h-screen bg-slate-950 print:bg-white">
              <div className="max-w-2xl mx-auto px-4 py-12 print:py-6">
              
                {/* Header */}
                      <div className="text-center mb-12 print:mb-8">
                                <div
                                              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center print:border-2 print:border-amber-400"
                                              style={{
                                                              background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)',
                                                              boxShadow: '0 0 48px rgba(245,158,11,0.25)',
                                              }}
                                            >
                                            <span className="text-slate-900 font-bold text-lg">IR</span>span>
                                </div>div>
                                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2 print:text-amber-700">
                                            First Light
                                </p>p>
                                <h1 className="text-3xl font-light text-white mb-2 tracking-tight print:text-slate-900">
                                  {firstName ? `${name}, here it is.` : 'Your Invisible Rule'}
                                </h1>h1>
                                <p className="text-slate-500 text-sm print:text-slate-600">
                                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>p>
                      </div>div>
              
                {/* Invisible Rule Hero Block */}
                {bopStatement && (
                    <div
                                  className="rounded-2xl p-8 mb-10 text-center print:border print:border-amber-300 print:bg-amber-50 print:mb-6"
                                  style={{
                                                  background: 'linear-gradient(135deg, rgba(245,158,11,0.09), rgba(180,83,9,0.06))',
                                                  border: '1px solid rgba(245,158,11,0.3)',
                                  }}
                                >
                                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4 print:text-amber-700">
                                              Your Invisible Rule
                                </p>p>
                                <p className="text-white text-lg leading-relaxed italic print:text-slate-900">
                                              &ldquo;{bopStatement}&rdquo;
                                </p>p>
                    </div>div>
                      )}
              
                {/* Context section */}
                {context && (
                    <div
                                  className="rounded-2xl p-8 mb-6 print:border print:border-slate-200 print:bg-white print:p-6"
                                  style={{
                                                  background: 'rgba(15, 23, 42, 0.7)',
                                                  border: '1px solid rgba(51, 65, 85, 0.8)',
                                  }}
                                >
                                <h2 className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4 print:text-amber-700">
                                              Context
                                </h2>h2>
                                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px] print:text-slate-800">
                                  {context}
                                </div>div>
                    </div>div>
                      )}
              
                {/* Upgrade CTA */}
                      <div
                                  className="mt-8 rounded-2xl p-8 text-center print:hidden"
                                  style={{
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(51, 65, 85, 0.6)',
                                  }}
                                >
                                <p className="text-white font-medium mb-2">Want the full picture?</p>p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                                            The Blueprint maps every layer - the evidence, what it protected, what it costs today,
                                            and your path forward.
                                </p>p>
                                <a
                                              href={process.env.NEXT_PUBLIC_GHL_URL_TIER2 || '/'}
                                              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-slate-900 transition-all hover:scale-105 active:scale-95"
                                              style={{
                                                              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                              boxShadow: '0 8px 32px rgba(245,158,11,0.2)',
                                              }}
                                            >
                                            Upgrade to The Blueprint - $27
                                </a>a>
                      </div>div>
              
                {/* Action bar */}
                      <div className="flex gap-3 mt-8 print:hidden">
                                <button
                                              onClick={handleDownload}
                                              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:bg-slate-700 active:scale-95"
                                              style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
                                            >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>svg>
                                  {isMobile ? 'Share / Save' : 'Download as PDF'}
                                </button>button>
                                <Link
                                              href="/"
                                              className="flex items-center justify-center px-6 py-4 rounded-xl text-slate-400 hover:text-slate-200 transition-colors text-sm"
                                            >
                                            Return to home
                                </Link>Link>
                      </div>div>
              
                {/* Footer */}
                      <div className="text-center mt-10 print:mt-6">
                                <p className="text-slate-700 text-xs print:text-slate-500">
                                            &copy; {new Date().getFullYear()}{' '}The Invisible Rule
                                </p>p>
                      </div>div>
              
              </div>div>
        </div>div>
      );
}</div>
