/**
 * Worksheet PDF Generation API
 *
 * GET /api/documents/worksheet-pdf/:worksheetId
 * Generate printable worksheet PDF with FDI teeth diagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateWorksheetPDF } from '@/lib/pdf/worksheet-pdf-generator';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/documents/worksheet-pdf/:worksheetId
 * Generate and return worksheet PDF
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
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

    // All authenticated users can generate worksheet PDFs for printing
    const { worksheetId } = await params;

    // Get locale from query params or default to 'en'
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'en';

    if (!['en', 'sl'].includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Supported: en, sl' },
        { status: 400 }
      );
    }

    console.log(`[API] Generating worksheet PDF with locale: ${locale}`);

    // Verify worksheet exists
    const worksheet = await prisma.workSheet.findUnique({
      where: { id: worksheetId },
      select: {
        id: true,
        worksheetNumber: true,
        status: true,
      },
    });

    if (!worksheet) {
      return NextResponse.json(
        { error: 'Worksheet not found' },
        { status: 404 }
      );
    }

    // Check if lab configuration exists
    try {
      const labConfig = await prisma.labConfiguration.findFirst();
      if (!labConfig) {
        return NextResponse.json(
          {
            error: 'Laboratory configuration not found. Please configure system settings first.',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load laboratory configuration',
        },
        { status: 500 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateWorksheetPDF(worksheetId, locale);

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${worksheet.worksheetNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[API] Worksheet PDF generation failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate worksheet PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
