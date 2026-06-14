import type { Metadata } from 'next';
import { Suspense } from 'react';
import ThankYouContent from './ThankYouContent';

export const metadata: Metadata = {
  title: 'Thank you — The Invisible Rule',
};

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
