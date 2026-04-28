import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/types';

export async function POST(req: NextRequest) {
  const leadData: LeadData = await req.json();

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
        firstName: leadData.firstName,
        email: leadData.email,
        sessionId: leadData.sessionId,
        sessionTranscript: leadData.sessionTranscript,
        workingHypothesis: leadData.workingHypothesis,
        confirmedHypothesis: leadData.confirmedHypothesis,
        detectedArchetype: leadData.detectedArchetype,
        tolerations: leadData.tolerations,
        patternData: leadData.patternData,
        completedAt: leadData.completedAt,
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
