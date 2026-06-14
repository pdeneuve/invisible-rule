'use client';

import { useState } from 'react';

interface Result {
  code: string;
  coupon: 'created' | 'exists' | 'error';
  promotion: 'created' | 'exists' | 'error';
  detail?: string;
}

export default function StripeSetupPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/setup-stripe-coupons', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `Server returned ${res.status}`);
      } else {
        setResults(json.results || []);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const badge = (s: 'created' | 'exists' | 'error') => {
    const cls =
      s === 'created'
        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50'
        : s === 'exists'
          ? 'bg-amber-900/40 text-amber-300 border-amber-700/40'
          : 'bg-red-900/50 text-red-300 border-red-700/50';
    return <span className={`text-xs px-2 py-1 rounded border ${cls}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-light text-white mb-3">Stripe Coupon Setup</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          One-click setup of the four Invisible Rule coupons in your Stripe
          dashboard. Each is 100% off, forever. Safe to run multiple times —
          existing coupons are left untouched.
        </p>

        <ul className="text-slate-300 text-sm mb-8 space-y-1">
          <li>• <span className="font-mono text-amber-300">DEEPDIVEGIFT</span> — General free gift / mixed purpose</li>
          <li>• <span className="font-mono text-amber-300">CLIENT2026</span> — Clients who already paid offline</li>
          <li>• <span className="font-mono text-amber-300">TESTIMONIAL2026</span> — People asked for a testimonial</li>
          <li>• <span className="font-mono text-amber-300">VIPACCESS</span> — Special guests / VIPs</li>
        </ul>

        <button
          onClick={run}
          disabled={running}
          className="w-full py-4 rounded-2xl text-slate-900 font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
          }}
        >
          {running ? 'Creating coupons in Stripe...' : 'Create all four coupons in Stripe'}
        </button>

        {error && (
          <div className="mt-6 bg-red-900/30 border border-red-700/50 rounded-2xl p-5 text-red-300">
            <p className="font-medium mb-2">Setup failed</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {results && (
          <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white text-lg font-medium mb-4">Results</h2>
            <div className="space-y-3">
              {results.map(r => (
                <div key={r.code} className="border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-amber-300 text-sm">{r.code}</span>
                    <div className="flex gap-2">
                      <span className="text-xs text-slate-500">coupon</span>
                      {badge(r.coupon)}
                      <span className="text-xs text-slate-500 ml-2">code</span>
                      {badge(r.promotion)}
                    </div>
                  </div>
                  {r.detail && <p className="text-red-300 text-xs mt-2">{r.detail}</p>}
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-5">
              Done. Test the codes on the Stripe Checkout page now — they should be accepted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
