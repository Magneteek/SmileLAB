import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { generateAnnexXIII } from '@/lib/pdf/annex-xiii-generator';
import { generateWorksheetPDF } from '@/lib/pdf/worksheet-pdf-generator';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface GenerateWorksheetRequest {
  worksheetNumber: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body: GenerateWorksheetRequest = await request.json();

    const { worksheetNumber } = body;

    if (!worksheetNumber) {
      return Response.json(
        { error: 'Worksheet number is required' },
        { status: 400 }
      );
    }

    // Find the worksheet
    const worksheet = await prisma.workSheet.findFirst({
      where: { worksheetNumber },
      include: {
        qualityControls: true,
      },
    });

    if (!worksheet) {
      return Response.json(
        { error: `Worksheet ${worksheetNumber} not found` },
        { status: 404 }
      );
    }

    const generated: string[] = [];
    const errors: string[] = [];

    // Create documents directory if it doesn't exist
    const documentsDir = join(process.cwd(), 'storage', 'documents', worksheet.id);
    if (!existsSync(documentsDir)) {
      await mkdir(documentsDir, { recursive: true });
    }

    // 1. Generate Worksheet PDF
    try {
      const worksheetPDF = await generateWorksheetPDF(worksheet.id);
      const fileName = `worksheet-${worksheetNumber}.pdf`;
      const filePath = join(documentsDir, fileName);

      await writeFile(filePath, worksheetPDF);

      // Check if document already exists
      const existingDoc = await prisma.document.findFirst({
        where: {
          worksheetId: worksheet.id,
          type: 'OTHER',
          documentNumber: {
            contains: worksheetNumber,
          },
        },
      });

      if (!existingDoc) {
        await prisma.document.create({
          data: {
            worksheetId: worksheet.id,
            type: 'OTHER',
            documentNumber: `WS-${worksheetNumber}`,
            fileName,
            filePath,
            fileSize: worksheetPDF.length,
            mimeType: 'application/pdf',
            generatedAt: new Date(),
            retentionUntil: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
            generatedBy: session.user.id,
            notes: 'Worksheet PDF',
          },
        });
        generated.push('Worksheet PDF');
      } else {
        errors.push('Worksheet PDF already exists');
      }
    } catch (error) {
      console.error('Error generating worksheet PDF:', error);
      errors.push(`Worksheet PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Generate Annex XIII if QC approved
    if (worksheet.qualityControls?.[0]?.result === 'APPROVED') {
      try {
        // generateAnnexXIII already handles document creation and file storage
        await generateAnnexXIII(worksheet.id, session.user.id);
        generated.push('Annex XIII');
      } catch (error) {
        console.error('Error generating Annex XIII:', error);
        errors.push(`Annex XIII: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      errors.push('Annex XIII: Worksheet must be QC approved');
    }

    // 3. Generate QC Report if QC exists
    if (worksheet.qualityControls && worksheet.qualityControls.length > 0) {
      try {
        // For now, we'll skip QC report as it would need a single-worksheet version
        // The qc-reports-generator currently generates reports for multiple worksheets
        errors.push('QC Report: Single worksheet QC report not yet implemented');
      } catch (error) {
        console.error('Error generating QC report:', error);
        errors.push(`QC Report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return Response.json({
      success: true,
      worksheetNumber,
      generated,
      errors,
      message: `Generated ${generated.length} document(s) for ${worksheetNumber}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
