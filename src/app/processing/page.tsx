'use client';

import { Suspense } from 'react';
import ProcessingContent from './ProcessingContent';

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Preparing your report...</p>
        </div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
