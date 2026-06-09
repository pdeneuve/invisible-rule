'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import FirstLightDisplay from '@/components/FirstLightDisplay';
import DeepDiveDisplay from '@/components/DeepDiveDisplay';
import Link from 'next/link';

interface SessionEnvelope<T> {
  sessionId?: string;
  payload?: T;
}

export default function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');
  const tier: 1 | 2 | null = tierParam ? (parseInt(tierParam) as 1 | 2) : null;
  const sidFromUrl = searchParams.get('sid');

  const [report, setReport] = useState<Record<string, string> | null>(null);
  const [firstName, setFirstName] = useState('');
  const [stale, setStale] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reportRaw = localStorage.getItem('bop_report_a');
    const leadRaw = localStorage.getItem('bop_lead_data');

    // Reached /processing with no fresh session data — almost always means the
    // user followed a payment confirmation link, not a redirect from a voice
    // session. The email is the primary delivery; show a clean fallback.
    if (!reportRaw || !sidFromUrl) {
      if (!reportRaw && !leadRaw && !sidFromUrl) {
        router.push('/');
        return;
      }
      setStale(true);
      return;
    }

    let reportEnv: SessionEnvelope<Record<string, string>> | null = null;
    try { reportEnv = JSON.parse(reportRaw); } catch { /* malformed */ }

    if (!reportEnv || reportEnv.sessionId !== sidFromUrl || !reportEnv.payload) {
      // Stored report belongs to a different (older) session.
      localStorage.removeItem('bop_report_a');
      localStorage.removeItem('bop_lead_data');
      setStale(true);
      return;
    }

    setReport(reportEnv.payload);

    if (leadRaw) {
      try {
        const leadEnv: SessionEnvelope<{ firstName?: string }> = JSON.parse(leadRaw);
        if (leadEnv.sessionId === sidFromUrl && leadEnv.payload?.firstName) {
          setFirstName(leadEnv.payload.firstName);
        }
      } catch { /* ignore */ }
    }
  }, [router, sidFromUrl]);

  useEffect(() => {
    if (!report && !stale) {
      // Tier 2 fulfillment runs ~10 minutes (audio + slides + video). Give the
      // user a realistic wait window before suggesting they go check email.
      const ms = tier === 2 ? 60_000 : 15_000;
      const t = setTimeout(() => setTimedOut(true), ms);
      return () => clearTimeout(t);
    }
  }, [report, stale, tier]);

  if (stale) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)' }}
          >
            <span className="text-slate-900 font-bold">IR</span>
          </div>
          <h1 className="text-xl font-light text-white mb-2">Your report is on its way.</h1>
          <p className="text-slate-400 text-sm mb-6">
            Check your email — your report has been delivered there.
          </p>
          <Link href="/" className="text-amber-400 text-sm underline">
            Start a new session
          </Link>
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
