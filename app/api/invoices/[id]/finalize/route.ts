/**
 * Invoice Finalization API Route
 *
 * POST /api/invoices/:id/finalize - Finalize draft invoice (assign invoice number)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import { finalizeInvoice } from '@/src/lib/services/invoice-service';
import { generateInvoicePDF } from '@/lib/pdf/invoice-generator';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for finalizing invoice
 */
const finalizeInvoiceSchema = z.object({
  invoiceDate: z.string().datetime().optional(),
});

// ============================================================================
// POST /api/invoices/:id/finalize
// ============================================================================

/**
 * POST /api/invoices/:id/finalize
 * Finalize draft invoice - assign invoice number and lock editing
 *
 * Required permissions: ADMIN or INVOICING
 *
 * Request body (optional):
 * {
 *   invoiceDate?: "2025-01-15T00:00:00Z"  // Optional, defaults to current date
 * }
 *
 * Process:
 * 1. Validates invoice is in draft status
 * 2. Validates invoice has at least one line item
 * 3. Generates sequential invoice number based on invoice date (RAC-YYYY-NNN)
 * 4. Updates worksheets to INVOICED status
 * 5. Locks invoice for editing (isDraft = false)
 *
 * Response:
 * {
 *   id: "invoice_123",
 *   invoiceNumber: "RAC-2025-001",  // Newly assigned number
 *   isDraft: false,
 *   invoiceDate: "2025-01-15T00:00:00.000Z",
 *   totalAmount: 1250.00
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔒 Finalize API route called');

    // Check authentication and permissions
    await requireRole(['ADMIN', 'INVOICING']);
    console.log('✅ Auth check passed');

    const { id: invoiceId } = await params;
    console.log('📝 Invoice ID:', invoiceId);

    // Parse and validate request body (optional)
    let data: { invoiceDate?: Date } = {};

    try {
      const body = await request.json();
      console.log('📦 Request body:', body);

      const validated = await validateRequestBody(
        { json: async () => body } as NextRequest,
        finalizeInvoiceSchema
      );
      console.log('✅ Validation passed:', validated);

      data = {
        invoiceDate: validated.invoiceDate ? new Date(validated.invoiceDate) : undefined,
      };
    } catch (error) {
      console.log('⚠️ Body parsing error:', error);
      // Empty body is acceptable - use current date
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }

    console.log('🚀 Calling finalizeInvoice with data:', data);
    // Finalize invoice
    const invoice = await finalizeInvoice(invoiceId, data);
    console.log('✅ Invoice finalized:', invoice.invoiceNumber);

    // Generate PDF for the finalized invoice (non-blocking - don't fail if PDF generation fails)
    let pdfPath = null;
    let pdfError = null;

    try {
      console.log('📄 Generating PDF for invoice:', invoice.invoiceNumber);
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        throw new Error('User session not found');
      }

      const invoiceWithPDF = await generateInvoicePDF(invoice.id, session.user.id);
      pdfPath = invoiceWithPDF.pdfPath;
      console.log('✅ PDF generated at:', pdfPath);
    } catch (pdfGenerationError) {
      console.error('⚠️ PDF generation failed (invoice still finalized):', pdfGenerationError);
      pdfError = pdfGenerationError instanceof Error ? pdfGenerationError.message : 'PDF generation failed';
      // Don't throw - invoice was successfully finalized, PDF can be regenerated later
    }

    return successResponse(
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        isDraft: invoice.isDraft,
        dentistId: invoice.dentistId,
        worksheetIds: invoice.lineItems
          .filter((item) => item.worksheetId)
          .map((item) => item.worksheetId),
        lineItemCount: invoice.lineItems.length,
        totalAmount: invoice.totalAmount.toNumber(),
        paymentStatus: invoice.paymentStatus,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        pdfPath,
        pdfError, // Include error if PDF generation failed
      },
      pdfError
        ? `Invoice ${invoice.invoiceNumber} finalized successfully. PDF generation failed: ${pdfError}`
        : `Invoice ${invoice.invoiceNumber} finalized successfully. PDF generated.`,
      200
    );
  } catch (error) {
    console.error('❌ Finalize invoice error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return handleApiError(error);
  }
}
