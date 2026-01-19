/**
 * Price List PDF API Route
 *
 * GET /api/reports/price-list - Generate and download price list PDF
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/responses';
import { generatePriceListPDF } from '@/lib/pdf/price-list-generator';
import { ProductCategory } from '@prisma/client';

// ============================================================================
// GET /api/reports/price-list
// ============================================================================

/**
 * GET /api/reports/price-list
 * Generate price list PDF and return as downloadable file
 *
 * Query parameters:
 * - activeOnly: boolean (default: true) - Only include active products
 * - categories: string (comma-separated) - Filter by specific categories
 * - locale: string (default: 'en') - Language locale (en, sl)
 *
 * Returns: PDF file download
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    const { searchParams } = new URL(request.url);

    // Parse options
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true
    const categoriesParam = searchParams.get('categories');
    const categories = categoriesParam
      ? (categoriesParam.split(',') as ProductCategory[])
      : undefined;
    const locale = searchParams.get('locale') || 'en';

    console.log('[Price List API] Generating PDF with options:', {
      activeOnly,
      categories: categories || 'ALL',
      locale,
    });

    // Generate PDF
    const pdfBuffer = await generatePriceListPDF({
      activeOnly,
      categories,
      locale,
    });

    // Return PDF as downloadable file
    const filename = `price-list-${new Date().getFullYear()}-${new Date().toISOString().split('T')[0]}.pdf`;

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
