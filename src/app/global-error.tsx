'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{
              background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706, #92400e)',
              boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)',
            }}
          >
            <span className="text-white text-2xl font-light">IR</span>
          </div>
          <h1 className="text-3xl font-light mb-4">Something went wrong</h1>
          <p className="text-slate-400 mb-8">
            We hit an unexpected error and our team has been notified. Please try again, or return home.
          </p>
          <a
            href="/"
            className="inline-block px-8 py-4 rounded-2xl text-slate-900 font-semibold text-base"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
            }}
          >
            Return to Home
          </a>
        </div>
      </body>
    </html>
  );
}
