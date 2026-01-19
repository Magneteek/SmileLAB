/**
 * Dentist Information Sheet PDF API Route
 *
 * GET /api/reports/dentist-info/[id] - Generate and download dentist information sheet PDF
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generateDentistInformationSheetPDF } from '@/lib/pdf/dentist-information-sheet-generator';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/reports/dentist-info/[id]
// ============================================================================

/**
 * GET /api/reports/dentist-info/[id]
 * Generate dentist information sheet PDF and return as downloadable file
 *
 * Params:
 * - id: Dentist ID
 *
 * Query parameters:
 * - locale: string (default: 'en') - Language locale (en, sl)
 *
 * Returns: PDF file download with complete dentist information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await requireAuth();

    const { id: dentistId } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    console.log(`[Dentist Info API] Generating for dentist: ${dentistId} (locale: ${locale})`);

    // Verify dentist exists
    const dentist = await prisma.dentist.findUnique({
      where: { id: dentistId },
      select: { dentistName: true, clinicName: true },
    });

    if (!dentist) {
      return new Response('Dentist not found', { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = await generateDentistInformationSheetPDF(dentistId, locale);

    // Create safe filename from clinic name
    const safeClinicName = dentist.clinicName
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    const filename = `dentist-info-${safeClinicName}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
