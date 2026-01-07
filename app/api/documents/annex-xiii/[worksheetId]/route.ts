/**
 * Annex XIII Document Generation API
 *
 * POST /api/documents/annex-xiii/:worksheetId
 * Generate EU MDR Annex XIII Manufacturer's Statement for a worksheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAnnexXIII } from '@/lib/pdf/annex-xiii-generator';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/documents/annex-xiii/:worksheetId
 * Generate Annex XIII PDF document
 */
export async function POST(
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

    // Only ADMIN, TECHNICIAN, and QC_INSPECTOR can generate documents
    if (!['ADMIN', 'TECHNICIAN', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    const { worksheetId } = await params;

    // Parse request body to get locale
    let locale = 'en'; // Default to English
    try {
      const body = await req.json();
      if (body.locale && ['en', 'sl'].includes(body.locale)) {
        locale = body.locale;
      }
    } catch (error) {
      // If no body or invalid JSON, use default locale
      console.log('[API] No locale specified in request body, using default: en');
    }

    console.log(`[API] Generating Annex XIII with locale: ${locale}`);

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

    // Check if worksheet is QC approved
    if (worksheet.status !== 'QC_APPROVED') {
      return NextResponse.json(
        {
          error: 'Worksheet must be QC approved before generating Annex XIII',
          currentStatus: worksheet.status,
        },
        { status: 400 }
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

    console.log(`[API] Generating Annex XIII for worksheet ${worksheet.worksheetNumber} in ${locale.toUpperCase()}`);

    // Generate Annex XIII PDF with specified locale
    const document = await generateAnnexXIII(worksheetId, session.user.id, locale);

    console.log(`[API] Annex XIII generated successfully: ${document.id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Annex XIII document generated successfully',
        document: {
          id: document.id,
          type: document.type,
          generatedAt: document.generatedAt,
          retentionUntil: document.retentionUntil,
          worksheetNumber: worksheet.worksheetNumber,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API] Annex XIII generation failed:', error);

    // Handle specific errors
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message?.includes('not configured')) {
      return NextResponse.json(
        { error: 'Laboratory configuration missing. Please configure settings first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate Annex XIII document',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/annex-xiii/:worksheetId
 * Download existing Annex XIII document
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

    const { worksheetId } = await params;

    // Get most recent Annex XIII document for this worksheet
    const document = await prisma.document.findFirst({
      where: {
        worksheetId,
        type: 'ANNEX_XIII',
      },
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        worksheet: {
          select: {
            worksheetNumber: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Annex XIII document not found for this worksheet' },
        { status: 404 }
      );
    }

    if (!document.filePath) {
      return NextResponse.json(
        { error: 'Document file path not found' },
        { status: 404 }
      );
    }

    // Read PDF file from disk
    const fs = require('fs').promises;
    let fileBuffer: Buffer;

    try {
      fileBuffer = await fs.readFile(document.filePath);
    } catch (error) {
      console.error('[API] Failed to read PDF file:', error);
      return NextResponse.json(
        { error: 'Document file not found on disk' },
        { status: 404 }
      );
    }

    // Return PDF file
    const filename = document.fileName || `Annex-XIII-${document.worksheet?.worksheetNumber || 'Unknown'}.pdf`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[API] Failed to download Annex XIII:', error);

    return NextResponse.json(
      {
        error: 'Failed to download document',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
