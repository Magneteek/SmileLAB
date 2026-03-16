/**
 * POST /api/email-inbox/poll
 * Manually trigger an email inbox poll.
 * Also used by the background poller in instrumentation.ts.
 *
 * GET /api/email-inbox/poll
 * Returns the last poll timestamp.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pollEmailInbox, getLastPollTime } from '@/lib/services/email-inbox-service';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lastPoll = await getLastPollTime();
  return NextResponse.json({ lastPoll: lastPoll?.toISOString() ?? null });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await pollEmailInbox();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Email poll error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
