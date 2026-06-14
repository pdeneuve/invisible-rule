'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const THANK_YOU_VIDEO_ID = '1YdfL-JEKAkAbw3nl0MDSinB6fzQYOqIn';

export default function ThankYouContent() {
  const [firstName, setFirstName] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let leadFirstName = '';
    try {
      const leadData = localStorage.getItem('bop_lead_data');
      if (leadData) {
        leadFirstName = JSON.parse(leadData).firstName || '';
        setFirstName(leadFirstName);
      }
    } catch { /* ignore */ }

    // If we arrived from Stripe Checkout, verify the payment and trigger
    // Deep Dive fulfillment server-side.
    const stripeSessionId = searchParams.get('stripe_session_id');
    if (stripeSessionId) {
      try {
        const reportData = localStorage.getItem('bop_report_a');
        const sessionStateData = localStorage.getItem('bop_session_state');
        const parsedReport = reportData ? JSON.parse(reportData) : null;
        const parsedSessionState = sessionStateData ? JSON.parse(sessionStateData) : null;
        fetch('/api/verify-stripe-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: stripeSessionId,
            report: parsedReport,
            sessionState: parsedSessionState,
          }),
        }).catch(err => console.warn('verify-stripe-payment failed:', err));
      } catch (err) {
        console.warn('Could not trigger Stripe verification:', err);
      }
    }
  }, [searchParams]);

  const name = firstName || 'Friend';

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 40% 40%,#fbbf24,#d97706)' }}
          >
            <span className="text-slate-900 font-bold text-lg">IR</span>
          </div>
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
            The Deep Dive
          </p>
          <h1 className="text-3xl font-light text-white mb-3 tracking-tight">
            Thank you, {name}.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Your Deep Dive is being prepared. You will receive your full report,
            personalized video, podcast, and slide deck by email shortly.
          </p>
        </div>

        <div className="mb-10">
          <p className="text-slate-400 text-sm text-center mb-3">A personal thank you from Pamela</p>
          <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl" style={{ aspectRatio: '16 / 9' }}>
            <iframe
              src={`https://drive.google.com/file/d/${THANK_YOU_VIDEO_ID}/preview`}
              allow="autoplay"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              title="Thank you from Pamela"
            />
          </div>
        </div>

        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}
        >
          <p className="text-slate-300 text-sm leading-relaxed">
            Watch the video above while we build your assets. Everything will arrive
            in your inbox within a few minutes.
          </p>
        </div>

        <div className="flex justify-center mt-8">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
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
