/**
 * Outstanding Invoices Report PDF API Route
 *
 * GET /api/reports/outstanding-invoices - Generate and download outstanding invoices report PDF
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generateOutstandingInvoicesReportPDF } from '@/lib/pdf/outstanding-invoices-report-generator';

// ============================================================================
// GET /api/reports/outstanding-invoices
// ============================================================================

/**
 * GET /api/reports/outstanding-invoices
 * Generate outstanding invoices report PDF and return as downloadable file
 *
 * Query parameters:
 * - locale: string (default: 'en') - Language locale (en, sl)
 *
 * Returns: PDF file download with aging analysis
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await requireAuth();

    // Check permissions (ADMIN or INVOICING only)
    if (!['ADMIN', 'INVOICING'].includes(session.user.role)) {
      return new Response('Forbidden: Insufficient permissions', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    console.log(`[Outstanding Invoices API] Generating report... (locale: ${locale})`);

    // Generate PDF
    const pdfBuffer = await generateOutstandingInvoicesReportPDF(locale);

    // Return PDF as downloadable file
    const filename = `outstanding-invoices-${new Date().toISOString().split('T')[0]}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
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
