import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProcessingContent from './ProcessingContent';

// Fix 8: Unique page title for this route
export const metadata: Metadata = {
    title: 'Preparing Your Report — The Invisible Rule',
};

export default function ProcessingPage() {
    return (
          <Suspense fallback={
                  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                          <div className="text-center">
                                    <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400">Preparing your report...</p>p>
                          </div>div>
                  </div>div>
            }>
                <ProcessingContent />
          </Suspense>Suspense>
        );
}</div>
