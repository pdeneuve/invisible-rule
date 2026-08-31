'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FirstLightDisplay from '@/components/FirstLightDisplay';
import DeepDiveDisplay from '@/components/DeepDiveDisplay';
import Link from 'next/link';

export default function ProcessingContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');
  const tier: 1 | 2 | null = tierParam ? (parseInt(tierParam) as 1 | 2) : null;
  const stripeSessionId = searchParams.get('stripe_session_id');
  const couponParam = searchParams.get('coupon');
  const freeParam = searchParams.get('free');
  const [report, setReport] = useState<Record<string, string> | null>(null);
  const [firstName, setFirstName] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [missingLocalStorage, setMissingLocalStorage] = useState(false);

  // "Signals of a real customer" — any of these mean we should never
  // silently bounce them to the sales page. Their money is real; even
  // if their browser dropped localStorage (Safari private, Meta in-app
  // browser, cross-context), we owe them a clear "payment received"
  // status and instructions to check their email.
  const arrivedViaPayment = !!(stripeSessionId || couponParam || freeParam);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reportData = localStorage.getItem('bop_report_a') || sessionStorage.getItem('bop_report_a');
    const leadData = localStorage.getItem('bop_lead_data') || sessionStorage.getItem('bop_lead_data');

    if (!reportData && !leadData) {
      // Do NOT redirect a paying user to the sales page. Show them a
      // friendly "payment received" screen instead.
      setMissingLocalStorage(true);
      return;
    }

    if (reportData) {
      try {
        const parsed = JSON.parse(reportData);
        if (parsed) setReport(parsed);
      } catch { /* malformed */ }
    }
    if (leadData) {
      try {
        setFirstName(JSON.parse(leadData).firstName);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!report && !missingLocalStorage) {
      const t = setTimeout(() => setTimedOut(true), 15000);
      return () => clearTimeout(t);
    }
  }, [report, missingLocalStorage]);

  // Recovery screen for paying users whose browser lost localStorage.
  // We show a warm confirmation, not a redirect to the sales page.
  if (missingLocalStorage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 40% 40%,#fbbf24,#d97706)' }}
          >
            <svg className="w-8 h-8 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {arrivedViaPayment ? (
            <>
              <h1 className="text-2xl font-light text-white mb-3 tracking-tight">
                We received your order.
              </h1>
              <p className="text-slate-300 leading-relaxed mb-4">
                {tier === 2
                  ? 'Your Deep Dive is being built right now. In 2 to 3 minutes it will arrive in your email inbox — full 12-section report, personalized podcast, slides, and video.'
                  : 'Your First Light report is being sent to your email inbox — usually within 1 minute.'}
              </p>
              <p className="text-slate-400 text-sm mb-6">
                Please check <strong className="text-white">both your inbox and your spam folder</strong> for a message from
                {' '}<span className="text-amber-400">pamela@theinvisiblerule.com</span>.
              </p>
              <p className="text-slate-500 text-xs mb-8">
                If nothing arrives within 15 minutes, email
                {' '}<a href="mailto:pamela@theinvisiblerule.com" className="text-amber-400 underline">pamela@theinvisiblerule.com</a> and
                we will resend it right away.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-xl text-slate-400 hover:text-slate-200 transition-colors text-sm border border-slate-700 hover:border-slate-500"
              >
                Return to home
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-light text-white mb-3 tracking-tight">
                We could not find your session.
              </h1>
              <p className="text-slate-300 leading-relaxed mb-6">
                Your browser doesn&apos;t have any recent session data. If you were in the middle of one, you may need to start again.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition-colors"
              >
                Start a voice session
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 mb-1">Preparing your report...</p>
          <p className="text-slate-600 text-sm">This takes just a moment</p>
          {timedOut && (
            <div className="mt-6">
              <p className="text-slate-500 text-sm mb-4">
                Check your email - your report may have been sent there.
              </p>
              <Link href="/" className="text-amber-400 text-sm underline">Return to home</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tier 1 (paid First Light $7) gets the short FirstLightDisplay
  if (tier === 1) {
    return <FirstLightDisplay report={report} firstName={firstName} />;
  }

  // Free users (no tier) and Tier 2 paid Deep Dive both get the full DeepDiveDisplay
  return <DeepDiveDisplay report={report} firstName={firstName} />;
}
