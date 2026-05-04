import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/types';

interface SubmitLeadBody extends Partial<LeadData> {
  tags?: string[];
}

export async function POST(req: NextRequest) {
  const body: SubmitLeadBody = await req.json();

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
      throw new Error(`Webhook responded with ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook submission failed:', error);
    return NextResponse.json({ success: true, webhookError: true });
  }
}
