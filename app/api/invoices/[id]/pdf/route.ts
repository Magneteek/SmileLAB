/**
 * Invoice PDF Download API
 *
 * GET /api/invoices/[id]/pdf
 * Download invoice PDF document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/invoices/[id]/pdf
 * Download invoice PDF
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get invoice with PDF path
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        pdfPath: true,
        isDraft: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.isDraft) {
      return NextResponse.json(
        { error: 'Cannot download PDF for draft invoice. Please finalize invoice first.' },
        { status: 400 }
      );
    }

    if (!invoice.pdfPath) {
      return NextResponse.json(
        { error: 'Invoice PDF not generated yet' },
        { status: 404 }
      );
    }

    // Read PDF file from disk
    const fs = require('fs').promises;
    let fileBuffer: Buffer;

    try {
      fileBuffer = await fs.readFile(invoice.pdfPath);
    } catch (error) {
      console.error('[API] Failed to read PDF file:', error);
      return NextResponse.json(
        { error: 'PDF file not found on disk' },
        { status: 404 }
      );
    }

    // Return PDF file
    const filename = `Invoice-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[API] Failed to download invoice PDF:', error);

    return NextResponse.json(
      {
        error: 'Failed to download invoice PDF',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
