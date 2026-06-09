import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://88a8843522327aa87e7618252019c16a@o4511467748720640.ingest.us.sentry.io/4511468667666432';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
