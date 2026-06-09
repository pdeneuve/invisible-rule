import { NextRequest, NextResponse } from 'next/server';
import { verifyVapiSecret } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!verifyVapiSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ received: true });
    }

    // Log only the event type — never the transcript or summary, which may
    // contain PII and end up in third-party log indexers.
    console.log('VAPI webhook event:', message.type);

    if (message.type === 'end-of-call-report') {
      const call = message.call;
      console.log('Call ended:', {
        callId: call?.id,
        endedAt: call?.endedAt,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
