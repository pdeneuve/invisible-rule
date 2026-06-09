import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/types';
import {
  verifyOriginOrSameSite,
  rateLimit,
  getClientIp,
} from '@/lib/auth';

interface SubmitLeadBody extends Partial<LeadData> {
  tags?: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: NextRequest) {
  if (!verifyOriginOrSameSite(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`submit-lead:${getClientIp(req)}`, 8)) {
    return NextResponse.json({ success: false, error: 'rate limited' }, { status: 429 });
  }

  let body: SubmitLeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid body' }, { status: 400 });
  }

  if (!body.email || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ success: false, error: 'invalid email' }, { status: 400 });
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('WEBHOOK_URL not configured');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: body.firstName,
        email: body.email,
        sessionId: body.sessionId,
        sessionTranscript: body.sessionTranscript,
        workingHypothesis: body.workingHypothesis,
        confirmedHypothesis: body.confirmedHypothesis,
        detectedArchetype: body.detectedArchetype,
        tolerations: body.tolerations,
        patternData: body.patternData,
        completedAt: body.completedAt,
        tags: body.tags || [],
        source: 'invisible-rule-app',
      }),
    });

    if (!response.ok) {
      console.error(`submit-lead: webhook responded ${response.status}`);
      // Tell the client we failed; previous behaviour swallowed errors and
      // created ghost leads.
      return NextResponse.json(
        { success: false, error: 'webhook downstream error' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook submission failed:', error);
    return NextResponse.json(
      { success: false, error: 'webhook unreachable' },
      { status: 502 },
    );
  }
}
