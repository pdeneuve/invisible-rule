'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FirstLightDisplay from '@/components/FirstLightDisplay';
import DeepDiveDisplay from '@/components/DeepDiveDisplay';
import Link from 'next/link';

function ReportContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');
  const tier: 1 | 2 | null = tierParam ? (parseInt(tierParam) as 1 | 2) : null;

  const [report, setReport] = useState<Record<string, string> | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const reportData = localStorage.getItem('bop_report_a') || sessionStorage.getItem('bop_report_a');
      const leadData = localStorage.getItem('bop_lead_data') || sessionStorage.getItem('bop_lead_data');
      if (reportData) {
        try {
          const parsed = JSON.parse(reportData);
          if (parsed) setReport(parsed);
        } catch { /* malformed */ }
      }
      if (leadData) {
        try { setFirstName(JSON.parse(leadData).firstName); } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    if (!report) {
      const t = setTimeout(() => setTimedOut(true), 15000);
      return () => clearTimeout(t);
    }
  }, [report]);

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

  // Tier 2 (Deep Dive $97) gets the full DeepDiveDisplay with all assets
  if (tier === 2) {
    return <DeepDiveDisplay report={report} firstName={firstName} />;
  }

  // Free users (tier null) and Tier 1 (First Light $7) both get FirstLightDisplay
  return <FirstLightDisplay report={report} firstName={firstName} />;
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Preparing your report...</p>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
