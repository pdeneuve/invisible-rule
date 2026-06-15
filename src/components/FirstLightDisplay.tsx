'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Props {
  report: Record<string, string>;
  firstName?: string;
}

const VALID_COUPONS = ['DEEPDIVEGIFT', 'CLIENT2026', 'TESTIMONIAL2026', 'VIPACCESS'];
const DEEP_DIVE_VIDEO_ID = '1Ilxg_Ogzt8_WWkiUozKJbX_b45YK1Dxx';

const DEEP_DIVE_BENEFITS = [
  {
    icon: '📄',
    title: 'Your 12-point Core Insight Report',
    body: 'Every layer of your Invisible Rule mapped out — origin, payoff, cost, evolved principle, 30-day plan.',
  },
  {
    icon: '🎥',
    title: 'A personalized video from Pamela',
    body: 'Pamela walks you through your specific pattern, in her own voice, addressed to you by name.',
  },
  {
    icon: '🎧',
    title: 'A personalized podcast with a 3D view',
    body: 'Listen on the go — your pattern explored from every angle so it sticks.',
  },
  {
    icon: '🖼️',
    title: 'A personalized slide presentation',
    body: 'See what you have done — and exactly how to get past it — in a deck you can keep and share.',
  },
];

export default function FirstLightDisplay({ report, firstName }: Props) {
  const name = firstName || 'Friend';
  const bop = report.bopStatement || report.invisibleRule || '';
  const ctx = report.context || report.originContext || '';

  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailErrorDetail, setEmailErrorDetail] = useState('');

  const handleResendEmail = async () => {
    if (typeof window === 'undefined') return;
    setEmailStatus('sending');
    setEmailErrorDetail('');
    try {
      const leadData = localStorage.getItem('bop_lead_data');
      const reportData = localStorage.getItem('bop_report_a');
      const parsedLead = leadData ? JSON.parse(leadData) : null;
      const parsedReport = reportData ? JSON.parse(reportData) : report;
      if (!parsedLead?.email) {
        setEmailStatus('error');
        setEmailErrorDetail('No email address found.');
        return;
      }
      const r = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: parsedLead.firstName,
          email: parsedLead.email,
          report: parsedReport,
          tier: 1,
        }),
      });
      if (r.ok) {
        setEmailStatus('sent');
      } else {
        setEmailStatus('error');
        setEmailErrorDetail(`Server returned ${r.status}. ${await r.text()}`);
      }
    } catch (err) {
      setEmailStatus('error');
      setEmailErrorDetail(String(err));
    }
  };

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

  const handleGetDeepDive = async () => {
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
    if (effectiveCoupon) {
      // Just redirect to /thank-you with the coupon. The thank-you page
      // will trigger fulfillment from a stable page so the server has time
      // to actually finish (audio + slides + video + email take ~2 min).
      window.location.href = `/thank-you?tier=2&coupon=${encodeURIComponent(effectiveCoupon)}`;
      return;
    }
    // No coupon: go straight to Stripe Checkout (not GHL)
    try {
      const leadData = localStorage.getItem('bop_lead_data');
      const parsedLead = leadData ? JSON.parse(leadData) : null;
      const r = await fetch('/api/create-stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: parsedLead?.firstName || '',
          email: parsedLead?.email || '',
          tier: 2,
        }),
      });
      const json = await r.json();
      if (r.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      console.error('Stripe checkout failed:', json);
      alert(`Could not start checkout. ${json?.error || ''}`);
      setSubmitting(false);
    } catch (err) {
      console.error('Stripe checkout error:', err);
      alert('Could not start checkout. Please try again.');
      setSubmitting(false);
    }
  };

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

        <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}>
          <p className="text-slate-400 text-sm mb-3">Didn&apos;t receive the email?</p>
          <button
            onClick={handleResendEmail}
            disabled={emailStatus === 'sending'}
            className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {emailStatus === 'sending'
              ? 'Sending...'
              : emailStatus === 'sent'
                ? '✓ Email sent — check your inbox'
                : 'Resend my First Light email'}
          </button>
          {emailStatus === 'error' && (
            <p className="text-red-400 text-xs mt-3">{emailErrorDetail || 'Could not send. Try again.'}</p>
          )}
        </div>

        {/* Deep Dive upsell */}
        <div className="mt-20 pt-12 border-t border-slate-800/80">
          <div className="text-center mb-10">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Ready to go deeper?</p>
            <h2 className="text-3xl font-light text-white mb-3 tracking-tight">
              The Deep Dive — built for your Invisible Rule
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-lg mx-auto">
              Everything below is personalized to the pattern you just uncovered. Yours alone — not a template.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {DEEP_DIVE_BENEFITS.map((b, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 border border-amber-500/20"
                style={{ background: 'rgba(15,23,42,0.7)' }}
              >
                <div className="text-2xl mb-2">{b.icon}</div>
                <h3 className="text-white text-base font-medium mb-1.5">{b.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>

          <div className="mb-10">
            <p className="text-slate-400 text-sm text-center mb-3">A personal note from Pamela about The Deep Dive</p>
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={`https://drive.google.com/file/d/${DEEP_DIVE_VIDEO_ID}/preview`}
                allow="autoplay"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                title="Pamela on The Deep Dive"
              />
            </div>
          </div>

          <div
            className="rounded-2xl p-7 mb-6"
            style={{
              background: 'linear-gradient(135deg,rgba(245,158,11,0.10),rgba(180,83,9,0.05))',
              border: '1px solid rgba(245,158,11,0.35)',
            }}
          >
            <div className="flex items-end gap-2 justify-center mb-2">
              {couponApplied ? (
                <>
                  <span className="text-4xl font-light text-white">FREE</span>
                  <span className="text-slate-500 line-through text-lg mb-1">$97</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-light text-white">$97</span>
                </>
              )}
            </div>
            <p className="text-center text-slate-400 text-sm mb-6">
              Hear it. Read it. Feel it. Share it.
            </p>

            <div className="mb-4">
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
              {couponApplied && <p className="text-emerald-400 text-xs mt-2">Coupon applied — The Deep Dive is free for you.</p>}
            </div>

            <button
              onClick={handleGetDeepDive}
              disabled={submitting}
              className="w-full py-4 rounded-xl font-semibold text-base text-slate-900 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
              }}
            >
              {submitting
                ? 'Loading...'
                : couponApplied
                  ? 'Send my Deep Dive'
                  : 'Get The Deep Dive — $97'}
            </button>
            <p className="text-center text-slate-500 text-xs mt-4">
              Secure payment. Instant delivery. No subscriptions.
            </p>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-slate-700 text-xs">&copy; {new Date().getFullYear()} The Invisible Rule</p>
        </div>

      </div>
    </div>
  );
}
