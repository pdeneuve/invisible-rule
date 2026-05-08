'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ProfileData {
  firstName?: string;
  invisibleRule?: string;
  evolvedPrinciple?: string;
  costToday?: string;
  date?: string;
}

function ShareContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('d');

  let data: ProfileData = {};
  let valid = false;

  if (raw) {
    try {
      const decoded = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))));
      data = JSON.parse(decoded);
      valid = Boolean(data.invisibleRule);
    } catch { /* bad data */ }
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)' }}>
            <span className="text-slate-900 font-bold text-sm">IR</span>
          </div>
          <h1 className="text-white text-xl font-light mb-3">This link has expired or is invalid.</h1>
          <p className="text-slate-500 text-sm mb-6">Invisible Rule profiles are shared directly by their owner.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-slate-900 text-sm"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            Discover your own Invisible Rule
          </Link>
        </div>
      </div>
    );
  }

  const name = data.firstName || 'Someone';
  const date = data.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16">

      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)',
            boxShadow: '0 0 40px rgba(245,158,11,0.2)',
          }}>
          <span className="text-slate-900 font-bold text-sm">IR</span>
        </div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">The Invisible Rule</p>
        <h1 className="text-2xl font-light text-white mb-1">{name}&apos;s Invisible Rule Profile</h1>
        <p className="text-slate-600 text-sm">{date}</p>
      </div>

      <div className="w-full max-w-2xl space-y-5">

        {/* The Rule */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.09), rgba(180,83,9,0.06))',
            border: '1px solid rgba(245,158,11,0.28)',
          }}
        >
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Their Invisible Rule
          </p>
          <p className="text-white text-lg leading-relaxed italic">
            &ldquo;{data.invisibleRule}&rdquo;
          </p>
        </div>

        {/* What it costs */}
        {data.costToday && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(51, 65, 85, 0.8)',
            }}
          >
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
              What It Costs Today
            </p>
            <p className="text-slate-300 text-[15px] leading-relaxed">
              {data.costToday.length > 300 ? data.costToday.slice(0, 300) + '…' : data.costToday}
            </p>
          </div>
        )}

        {/* Evolved principle */}
        {data.evolvedPrinciple && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(51, 65, 85, 0.8)',
            }}
          >
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
              The New Principle They&apos;re Building
            </p>
            <p className="text-slate-300 text-[15px] leading-relaxed">
              {data.evolvedPrinciple.length > 300 ? data.evolvedPrinciple.slice(0, 300) + '…' : data.evolvedPrinciple}
            </p>
          </div>
        )}

        {data.fullBopHypothesis && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(212, 160, 23, 0.2)',
            }}
          >
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(212, 160, 23, 0.8)' }}>
              Full Pattern Hypothesis
            </p>
            <p className="text-lg leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.9)' }}>
              &ldquo;{data.fullBopHypothesis}&rdquo;
            </p>
          </div>
        )}

        {data.newOperatingPrinciple && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(212, 160, 23, 0.2)',
            }}
          >
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(212, 160, 23, 0.8)' }}>
              New Operating Principle
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {data.newOperatingPrinciple}
            </p>
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(51,65,85,0.5)',
          }}
        >
          <p className="text-white font-medium mb-2">What&apos;s your Invisible Rule?</p>
          <p className="text-slate-500 text-sm mb-5 leading-relaxed max-w-sm mx-auto">
            The unconscious pattern running your life from behind the scenes — mapped in a guided voice session.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3.5 rounded-xl font-semibold text-slate-900 transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 8px 24px rgba(245,158,11,0.25)',
            }}
          >
            Discover Your Invisible Rule →
          </Link>
        </div>
      </div>

      <p className="text-slate-700 text-xs mt-10">
        © {new Date().getFullYear()} The Invisible Rule
      </p>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
