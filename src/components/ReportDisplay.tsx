'use client';

import Link from 'next/link';

// ââ Version B — The Deep Dive (12 sections) ââââââââââââââââââââââââââââââââââ
const VERSION_B_SECTIONS = [
  { title: 'Origin Context', key: 'originContext' },
  { title: 'Your Tolerations Mapped', key: 'tolerationsMapped' },
  { title: 'First House Pattern Map', key: 'firstHousePatternMap' },
  { title: 'Memory Theme Analysis', key: 'memoryThemeAnalysis' },
  { title: 'Archetype Analysis', key: 'archetypeAnalysis' },
  { title: 'Full Invisible Rule Hypothesis', key: 'fullBopHypothesis' },
  { title: 'Payoff & Cost Analysis', key: 'payoffAndCost' },
  { title: 'Observation Findings', key: 'observationFindings' },
  { title: 'Neurological Shift Framework', key: 'neurologicalShift' },
  { title: 'Your New Operating Principle', key: 'newOperatingPrinciple' },
  { title: 'Your 30-Day Counter-Strategy', key: 'thirtyDayPlan' },
  { title: 'Integration & Identity', key: 'integrationAndIdentity' },
];

interface Props {
  report: Record<string, string>;
  firstName?: string;
  tier?: 1 | 2 | 3;
}

export default function ReportDisplay({ report, firstName, tier = 2 }: Props) {
  const name = firstName || 'You';
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isDeepDive = tier === 2;

  // Auto-detect which version based on report keys
  const sections = VERSION_B_SECTIONS;

  // The headline BOP statement — present in both versions
  const bopStatement = report.bopStatement || report.fullBopHypothesis || '';

  const buildShareText = () => {
    const lines: string[] = [
      'THE DEEP DIVE — MY INVISIBLE RULE',
      `Prepared for ${name}`,
      `${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
    ];
    if (bopStatement) {
      lines.push('MY INVISIBLE RULE');
      lines.push(`"${bopStatement}"`);
      lines.push('');
    }
    sections.forEach(s => {
      const content = report[s.key];
      if (content) {
        lines.push(s.title.toUpperCase());
        lines.push(content);
        lines.push('');
      }
    });
    lines.push('— The Invisible Rule');
    return lines.join('\n');
  };

  const handleDownload = async () => {
    if (isMobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'My Deep Dive Report',
          text: buildShareText(),
        });
        return;
      } catch { /* fall through to print */ }
    }
    window.print();
  };

  const tierLabel = 'The Deep Dive';
  const sectionCount = '12';

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 print:py-6">

        {/* ââ Header âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="text-center mb-12 print:mb-8">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center print:border-2 print:border-amber-400"
            style={{
              background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)',
              boxShadow: '0 0 48px rgba(245,158,11,0.25)',
            }}
          >
            <span className="text-slate-900 font-bold text-lg">IR</span>
          </div>
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2 print:text-amber-700">
            {tierLabel}
          </p>
          <h1 className="text-3xl font-light text-white mb-2 tracking-tight print:text-slate-900">
            {firstName ? `${name}, here is your report.` : 'Your Invisible Rule Report'}
          </h1>
          <p className="text-slate-500 text-sm print:text-slate-600">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            {sectionCount}-section analysis
          </p>
        </div>

        {/* ââ Invisible Rule — Hero Block ââââââââââââââââââââââââââââââââââââââ */}
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
            </p>
            <p className="text-white text-lg leading-relaxed italic print:text-slate-900">
              &ldquo;{bopStatement}&rdquo;
            </p>
          </div>
        )}

        {/* ââ Report Sections ââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="space-y-6 print:space-y-4">
          {sections.map((section, i) => {
            const content = report[section.key];
            if (!content) return null;
            return (
              <div
                key={section.key}
                className="rounded-2xl p-8 print:border print:border-slate-200 print:bg-white print:p-6"
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 print:border print:border-amber-300 print:text-amber-700"
                    style={{
                      background: 'rgba(245,158,11,0.15)',
                      color: '#f59e0b',
                      fontSize: '10px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <h2 className="text-amber-400 text-xs font-semibold uppercase tracking-widest print:text-amber-700">
                    {section.title}
                  </h2>
                </div>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px] print:text-slate-800">
                  {content}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Upgrade CTA — Tier 1 only ─────────────────────────────────── */}
        {!isDeepDive && (
          <div
            className="mt-10 rounded-2xl p-8 text-center print:hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(180,83,9,0.04))',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div
              className="inline-block text-amber-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              Go Deeper
            </div>
            <h3 className="text-white text-xl font-light mb-3">
              Ready for the full transformation dossier?
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
              The Deep Dive adds 4 more sections — including your archetype analysis, a neurological shift framework,
              a complete 30-day counter-strategy, and a personalized audio report in Pamela&apos;s voice.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_GHL_URL_TIER3 || '/'}
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-slate-900 transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 8px 32px rgba(245,158,11,0.2)',
              }}
            >
              Upgrade to The Deep Dive — $97
            </a>
          </div>
        )}

        {/* ââ Completion block — Deep Dive only âââââââââââââââââââââââââââââââ */}
        {isDeepDive && (
          <div
            className="mt-10 rounded-2xl p-8 text-center print:hidden"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            <p className="text-slate-300 font-medium mb-1">You have the full picture.</p>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
              This report — your archetype, your pattern, your 30-day path — is yours to return to.
              The work starts with noticing. You&apos;re already doing it.
            </p>
          </div>
        )}

        {/* ââ Action bar âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="flex gap-3 mt-8 print:hidden">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:bg-slate-700 active:scale-95"
            style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isMobile ? 'Share / Save' : 'Download PDF'}
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center py-4 rounded-xl font-semibold text-slate-900 transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
            }}
          >
            Start a New Session
          </Link>
        </div>

        {/* ââ Footer âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <div className="text-center mt-10 print:mt-6">
          <p className="text-slate-700 text-xs print:text-slate-500">
            © {new Date().getFullYear()} The Invisible Rule · The pattern you uncovered is real — and it&apos;s yours.
          </p>
        </div>

      </div>
    </div>
  );
}
