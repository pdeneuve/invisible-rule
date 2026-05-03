import { NextRequest, NextResponse } from 'next/server';
import { saveSession, StoredSession } from '@/lib/session-store';

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as Partial<StoredSession>;
    if (!data.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }
    const session: StoredSession = {
      email: data.email,
      firstName: data.firstName || '',
      sessionId: data.sessionId || '',
      transcript: data.transcript || '',
      report: data.report || null,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await saveSession(session);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('save-session error:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
