import { NextResponse } from 'next/server';

/**
 * Reports whether internal test mode is enabled.
 *
 * When TEST_MODE_ENABLED=true is set on the Vercel environment, the
 * `?test=firstlight` and `?test=deepdive` URLs bypass GHL payment so the
 * team can run end-to-end tests of the Tier 1 and Tier 2 flows.
 *
 * Set TEST_MODE_ENABLED back to anything else (or remove it) to instantly
 * close the backdoor — no redeploy needed.
 */
export async function GET() {
  return NextResponse.json({
    enabled: process.env.TEST_MODE_ENABLED === 'true',
  });
}
