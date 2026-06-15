'use client';

import { useState } from 'react';

interface Props {
  onSelectTier: (tier: 1, coupon?: string) => void;
}

const VALID_COUPONS = ['DEEPDIVEGIFT', 'CLIENT2026', 'TESTIMONIAL2026', 'VIPACCESS'];

export default function PricingScreen({ onSelectTier }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const handleApplyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (!VALID_COUPONS.includes(code)) {
      setCouponError('That code is not recognized.');
      setCouponApplied(false);
      return;
    }
    setCouponError('');
    setCouponApplied(true);
    setCoupon(code);
  };

  const handleContinue = () => {
    setSubmitting(true);
    // Auto-apply coupon if the user typed a valid code but did not click Apply.
    let effectiveCoupon = couponApplied ? coupon.trim().toUpperCase() : '';
    if (!effectiveCoupon) {
      const typed = coupon.trim().toUpperCase();
      if (typed && VALID_COUPONS.includes(typed)) {
        effectiveCoupon = typed;
        setCouponApplied(true);
        setCoupon(typed);
      }
    }
    onSelectTier(1, effectiveCoupon || undefined);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10 max-w-2xl">
        <div className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)' }}>
          <span className="text-slate-900 font-bold text-sm">IR</span>
        </div>
        <h1 className="text-3xl font-light text-white mb-3 tracking-tight">
          You did real work today.
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Your Invisible Rule has been mapped. Receive your First Light report below.
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="relative flex flex-col rounded-2xl border border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-slate-900 p-7">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-amber-400">
              First Light
            </p>
            <div className="flex items-end gap-2 mb-2">
              {couponApplied ? (
                <>
                  <span className="text-4xl font-light text-white">FREE</span>
                  <span className="text-slate-500 line-through text-lg mb-1">$7</span>
                </>
              ) : (
                <span className="text-4xl font-light text-white">$7</span>
              )}
            </div>
            <p className="text-slate-300 text-sm font-medium leading-snug">
              See your Invisible Rule for the first time
            </p>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            The moment of recognition - your unconscious pattern named, clearly and simply.
          </p>

          <ul className="space-y-2.5 mb-6">
            {[
              'Your Invisible Rule statement',
              'The one core insight that changes everything',
              'Delivered instantly by email',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 flex-shrink-0 text-amber-400">&#10003;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mb-5">
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">
              Have a coupon code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={e => { setCoupon(e.target.value); setCouponError(''); setCouponApplied(false); }}
                placeholder="Enter code"
                className="flex-1 bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors uppercase"
                disabled={couponApplied || submitting}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponApplied || submitting}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {couponApplied ? '✓ Applied' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
            {couponApplied && <p className="text-emerald-400 text-xs mt-2">Coupon applied — your report is free.</p>}
          </div>

          <button
            onClick={handleContinue}
            disabled={submitting}
            className="w-full py-4 rounded-xl font-semibold text-base text-slate-900 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
            }}
          >
            {submitting ? 'Loading...' : couponApplied ? 'Send my report' : 'Get First Light — $7'}
          </button>
        </div>

        <p className="text-slate-600 text-xs mt-6 text-center">
          Secure payment. Instant delivery. No subscriptions.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="block mx-auto text-slate-700 hover:text-slate-500 text-xs mt-4 transition-colors"
        >
          Start a new session
        </button>
      </div>
    </div>
  );
}
