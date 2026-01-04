/**
 * Invoice Details API Route
 *
 * GET /api/invoices/:id - Get invoice by ID
 * PATCH /api/invoices/:id - Update invoice payment status
 * DELETE /api/invoices/:id - Cancel invoice
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import {
  getInvoiceById,
  updateInvoicePayment,
  updateInvoice,
  finalizeInvoice,
  cancelInvoice,
  deleteDraftInvoice,
  deleteCanceledInvoice,
} from '@/src/lib/services/invoice-service';
import { PaymentStatus, LineItemType } from '@/src/types/invoice';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for payment status update
 */
const updatePaymentSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus),
  paidAt: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Schema for line item
 */
const lineItemSchema = z.object({
  id: z.string().nullish(), // Optional - undefined for new items
  worksheetId: z.string().nullish(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number(),
  lineType: z.enum(['product', 'shipping', 'discount', 'adjustment', 'custom']).nullish(),
  productCode: z.string().nullish(),
  productName: z.string().nullish(),
  notes: z.string().nullish(),
  position: z.number().nullish(),
});

/**
 * Schema for updating draft invoice
 */
const updateDraftSchema = z.object({
  dentistId: z.string().optional(),
  worksheetIds: z.array(z.string()).optional(),
  invoiceDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

/**
 * Schema for finalizing invoice
 */
const finalizeInvoiceSchema = z.object({
  invoiceDate: z.string().datetime().optional(),
});

// ============================================================================
// GET /api/invoices/:id
// ============================================================================

/**
 * GET /api/invoices/:id
 * Get invoice by ID with all relations
 *
 * Required permissions: Authenticated user
 *
 * Returns:
 * - Invoice with worksheet, products, dentist, patient details
 * - Payment history
 * - Email logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await requireAuth();

    const { id: invoiceId } = await params;

    // Get invoice
    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      return Response.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Serialize Decimal fields to numbers for client
    const serializedInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      discountRate: invoice.discountRate ? Number(invoice.discountRate) : null,
      discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : null,
    };

    return successResponse(serializedInvoice);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/invoices/:id
// ============================================================================

/**
 * PATCH /api/invoices/:id
 * Update invoice - either payment status OR draft invoice data
 *
 * Required permissions: ADMIN or INVOICING
 *
 * PAYMENT STATUS UPDATE (finalized invoices):
 * Request body:
 * {
 *   paymentStatus: "PAID" | "SENT" | "VIEWED" | "OVERDUE" | "CANCELLED",
 *   paidAt?: "2025-01-15T10:30:00.000Z",  // Required if paymentStatus is PAID
 *   paymentMethod?: "Bank Transfer",       // Optional
 *   notes?: "Paid via wire transfer"       // Optional
 * }
 *
 * DRAFT INVOICE UPDATE (draft invoices only):
 * Request body:
 * {
 *   dentistId?: "dentist_123",
 *   worksheetIds?: ["ws_1", "ws_2"],
 *   invoiceDate?: "2025-01-15T00:00:00Z",
 *   dueDate?: "2025-01-31T00:00:00Z",
 *   taxRate?: 22.00,
 *   notes?: "Updated notes",
 *   lineItems?: [...]  // Full replacement of line items
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    await requireRole(['ADMIN', 'INVOICING']);

    const { id: invoiceId } = await params;

    // Parse request body
    const body = await request.json();

    // Determine update type based on request structure
    const isPaymentUpdate = 'paymentStatus' in body;

    if (isPaymentUpdate) {
      // Payment status update
      const data = await validateRequestBody(
        { json: async () => body } as NextRequest,
        updatePaymentSchema
      );

      const updateData = {
        ...data,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      };

      const invoice = await updateInvoicePayment(invoiceId, updateData);

      return successResponse(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: invoice.paymentStatus,
          paidAt: invoice.paidAt,
          paymentMethod: invoice.paymentMethod,
        },
        `Invoice ${invoice.invoiceNumber} payment status updated to ${invoice.paymentStatus}`
      );
    } else {
      // Draft invoice update
      const data = await validateRequestBody(
        { json: async () => body } as NextRequest,
        updateDraftSchema
      );

      const updateData = {
        ...data,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      const invoice = await updateInvoice(invoiceId, updateData);

      return successResponse(
        {
          id: invoice.id,
          isDraft: invoice.isDraft,
          dentistId: invoice.dentistId,
          worksheetIds: invoice.lineItems
            .filter((item) => item.worksheetId)
            .map((item) => item.worksheetId),
          lineItemCount: invoice.lineItems.length,
          totalAmount: invoice.totalAmount.toNumber(),
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
        },
        'Draft invoice updated successfully'
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/invoices/:id
// ============================================================================

/**
 * DELETE /api/invoices/:id
 * Delete draft/canceled invoice OR cancel finalized invoice
 *
 * Required permissions: ADMIN or INVOICING
 *
 * Behavior:
 * - DRAFT invoices: Permanently deleted (hard delete)
 *   - Removes invoice and all line items from database
 *   - Associated worksheets become available for invoicing again
 *
 * - CANCELLED invoices: Permanently deleted (hard delete)
 *   - Removes invoice, line items, and PDF from database + disk
 *   - Only ADMIN role can delete cancelled invoices
 *
 * - FINALIZED invoices: Cancelled (soft delete)
 *   - Sets paymentStatus to CANCELLED
 *   - Invoice remains in database for audit trail
 *   - Worksheets reverted to QC_APPROVED status
 *   - Only ADMIN role can cancel finalized invoices
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    await requireRole(['ADMIN', 'INVOICING']);

    const { id: invoiceId } = await params;

    // First, get the invoice to check status
    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      return Response.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Handle draft deletion (hard delete)
    if (invoice.isDraft) {
      await deleteDraftInvoice(invoiceId);

      return successResponse(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          isDraft: true,
          deleted: true,
        },
        `Draft invoice ${invoice.invoiceNumber} deleted successfully. Associated worksheets are now available for invoicing.`
      );
    }

    // Handle canceled invoice deletion (hard delete)
    // Only ADMIN can delete canceled invoices
    if (invoice.paymentStatus === 'CANCELLED') {
      await requireRole(['ADMIN']);

      await deleteCanceledInvoice(invoiceId);

      return successResponse(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: 'CANCELLED',
          deleted: true,
        },
        `Canceled invoice ${invoice.invoiceNumber} permanently deleted from the system. PDF file and database records removed.`
      );
    }

    // Handle finalized invoice cancellation (soft delete)
    // Only ADMIN can cancel finalized invoices
    await requireRole(['ADMIN']);

    const cancelledInvoice = await cancelInvoice(invoiceId);

    return successResponse(
      {
        id: cancelledInvoice.id,
        invoiceNumber: cancelledInvoice.invoiceNumber,
        paymentStatus: cancelledInvoice.paymentStatus,
        isDraft: false,
        cancelled: true,
      },
      `Invoice ${cancelledInvoice.invoiceNumber} cancelled successfully. Associated worksheets reverted to QC_APPROVED status.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
