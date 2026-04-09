/**
 * Unified Email Send API
 *
 * POST /api/email/send
 *
 * Sends an email with optional invoice PDF and/or Annex XIII MDR documents.
 * Supports all combinations: invoice only, MDR docs only, or both.
 * Logs every send attempt to EmailLog with EmailLogDocument relations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendUnifiedEmail } from '@/lib/services/email-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, dentistId, invoiceId, documentIds, customNote } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }
    if (!invoiceId && (!documentIds || documentIds.length === 0)) {
      return NextResponse.json({ error: 'At least one of invoiceId or documentIds is required' }, { status: 400 });
    }

    const result = await sendUnifiedEmail({
      recipientEmail,
      dentistId,
      invoiceId: invoiceId || undefined,
      documentIds: documentIds || [],
      customNote: customNote || undefined,
      sentById: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId, sentTo: recipientEmail });
  } catch (error: any) {
    console.error('[POST /api/email/send]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
