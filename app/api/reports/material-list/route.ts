/**
 * Material List PDF API Route
 *
 * GET /api/reports/material-list - Generate and download material inventory report PDF
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generateMaterialListPDF } from '@/lib/pdf/material-list-generator';

// ============================================================================
// GET /api/reports/material-list
// ============================================================================

/**
 * GET /api/reports/material-list
 * Generate material inventory report PDF and return as downloadable file
 *
 * Query parameters:
 * - activeOnly: boolean (default: true) - Only include available LOTs
 * - showExpired: boolean (default: false) - Include expired LOTs
 * - locale: string (default: 'en') - Language locale (en, sl)
 *
 * Returns: PDF file download with material inventory and LOT tracking
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    const { searchParams } = new URL(request.url);

    // Parse options
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true
    const showExpired = searchParams.get('showExpired') === 'true'; // Default false
    const locale = searchParams.get('locale') || 'en';

    console.log('[Material List API] Generating PDF with options:', {
      activeOnly,
      showExpired,
      locale,
    });

    // Generate PDF
    const pdfBuffer = await generateMaterialListPDF({
      activeOnly,
      showExpired,
      locale,
    });

    // Return PDF as downloadable file
    const filename = `material-inventory-${new Date().toISOString().split('T')[0]}.pdf`;

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
