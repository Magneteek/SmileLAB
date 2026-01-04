/**
 * Invoice Email Sending API Route
 *
 * POST /api/invoices/[id]/send-email
 *
 * Sends invoice via email to the dentist's email address.
 * Requires invoice ID and optional recipient email override.
 * Logs email delivery to EmailLog table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendInvoiceEmail } from '@/lib/services/email-service';
import { prisma } from '@/lib/prisma';

/**
 * Send invoice via email
 *
 * @param request - Next.js request object
 * @param params - Route parameters with invoice ID
 * @returns JSON response with success status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15: params is now a Promise and must be awaited
    const { id: invoiceId } = await params;
    console.log('[Email API] Starting email send for invoice:', invoiceId);

    // Parse request body for optional recipient override
    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.recipientEmail;
    console.log('[Email API] Recipient email:', recipientEmail);

    // Fetch invoice to get dentist email
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Use provided email or default to dentist's email
    const emailTo = recipientEmail || invoice.dentist?.email;

    if (!emailTo) {
      return NextResponse.json(
        { error: 'No recipient email address available' },
        { status: 400 }
      );
    }

    // Send invoice email
    const result = await sendInvoiceEmail(invoiceId, emailTo);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update invoice payment status to SENT if currently DRAFT
    if (invoice.paymentStatus === 'DRAFT') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: 'SENT',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      messageId: result.messageId,
      sentTo: emailTo,
    });
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
