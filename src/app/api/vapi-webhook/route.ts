import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ received: true });
    }

    // Log all VAPI events
    console.log('VAPI webhook event:', message.type);

    if (message.type === 'end-of-call-report') {
      const { transcript, recordingUrl, summary, call } = message;

      console.log('Call ended:', {
        callId: call?.id,
        duration: call?.endedAt,
        transcriptLength: transcript?.length,
        summary,
        recordingUrl,
      });

      // Here you could:
      // 1. Store the transcript in a database
      // 2. Trigger report generation
      // 3. Send to your CRM
      // For now, just log it
    }

    if (message.type === 'transcript') {
      // Real-time transcript â handle if needed
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
