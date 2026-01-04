/**
 * Invoices API Route
 *
 * GET /api/invoices - List all invoices with filters and pagination
 * POST /api/invoices - Generate invoice from worksheet
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
  generateInvoice,
  createInvoice,
  listInvoices,
} from '@/src/lib/services/invoice-service';
import { generateInvoicePDF } from '@/lib/pdf/invoice-generator';
import { PaymentStatus, LineItemType } from '@/src/types/invoice';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for line item
 */
const lineItemSchema = z.object({
  worksheetId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number(),
  lineType: z.enum(['product', 'shipping', 'discount', 'adjustment', 'custom']).optional(),
  productCode: z.string().optional(),
  productName: z.string().optional(),
  notes: z.string().optional(),
  position: z.number().optional(),
});

/**
 * Schema for creating invoice (new flexible system)
 */
const createInvoiceSchema = z.object({
  dentistId: z.string().optional(),
  worksheetIds: z.array(z.string()).optional(),
  invoiceDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  serviceDate: z.string().datetime().optional(),
  issuedBy: z.string().max(200).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
  isDraft: z.boolean().optional(),
});

/**
 * Schema for invoice generation (legacy - single worksheet)
 */
const generateInvoiceSchema = z.object({
  worksheetId: z.string().min(1, 'Worksheet ID is required'),
  dueDate: z.string().datetime().optional(),
  serviceDate: z.string().datetime().optional(),
  issuedBy: z.string().max(200).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// GET /api/invoices
// ============================================================================

/**
 * GET /api/invoices
 * List all invoices with filters and pagination
 *
 * Required permissions: ADMIN, INVOICING, or TECHNICIAN
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - paymentStatus: PaymentStatus | PaymentStatus[] (filter by payment status)
 * - dentistId: string (filter by dentist)
 * - dateFrom: string (ISO date, filter by invoice date from)
 * - dateTo: string (ISO date, filter by invoice date to)
 * - search: string (search by invoice number, worksheet number, dentist name)
 * - overdue: boolean (filter overdue invoices)
 * - sortBy: string (default: 'invoiceDate')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    const { searchParams } = new URL(request.url);

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'invoiceDate';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Parse filters
    const filters: any = {};

    const paymentStatus = searchParams.get('paymentStatus');
    if (paymentStatus) {
      // Support comma-separated values for multiple statuses
      const statuses = paymentStatus.split(',');
      filters.paymentStatus =
        statuses.length === 1 ? statuses[0] : statuses;
    }

    const dentistId = searchParams.get('dentistId');
    if (dentistId) {
      filters.dentistId = dentistId;
    }

    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const overdue = searchParams.get('overdue');
    if (overdue === 'true') {
      filters.overdue = true;
    }

    // List invoices
    const result = await listInvoices(filters, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/invoices
// ============================================================================

/**
 * POST /api/invoices
 * Create invoice (flexible system) or generate from worksheet (legacy)
 *
 * Required permissions: ADMIN or INVOICING
 *
 * NEW FLEXIBLE SYSTEM (recommended):
 * Request body:
 * {
 *   dentistId?: "dentist_123",              // Optional if worksheetIds provided
 *   worksheetIds?: ["ws_1", "ws_2"],        // Optional - auto-import products
 *   invoiceDate?: "2025-01-15T00:00:00Z",  // Optional, defaults to now
 *   dueDate?: "2025-01-31T00:00:00.000Z",  // Optional
 *   taxRate?: 22.00,                        // Optional, defaults to 22%
 *   notes?: "Custom invoice notes",
 *   lineItems: [                            // Custom line items
 *     {
 *       description: "Custom service",
 *       quantity: 1,
 *       unitPrice: 50.00,
 *       lineType: "custom"
 *     }
 *   ],
 *   isDraft?: true                          // Optional, defaults to true
 * }
 *
 * LEGACY SYSTEM (backward compatible):
 * Request body:
 * {
 *   worksheetId: "worksheet_123",           // Single worksheet
 *   dueDate?: "2025-01-31T00:00:00.000Z",
 *   taxRate?: 22.00,
 *   notes?: "Payment by bank transfer only"
 * }
 *
 * Response includes:
 * - Draft invoices: id, isDraft=true, invoiceNumber=null
 * - Finalized invoices: id, isDraft=false, invoiceNumber="RAC-2025-001"
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await requireRole(['ADMIN', 'INVOICING']);

    // Parse request body
    const body = await request.json();

    // Determine which system to use based on request structure
    const isLegacyRequest = 'worksheetId' in body && !('lineItems' in body);

    if (isLegacyRequest) {
      // Legacy system - single worksheet, immediate finalization
      const data = await validateRequestBody(
        { json: async () => body } as NextRequest,
        generateInvoiceSchema
      );

      const generateData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      const invoice = await generateInvoice(generateData, session.user.id);

      // Generate PDF for finalized invoices
      let pdfPath = null;
      if (!invoice.isDraft && invoice.invoiceNumber) {
        const invoiceWithPDF = await generateInvoicePDF(invoice.id, session.user.id);
        pdfPath = invoiceWithPDF.pdfPath;
      }

      return successResponse(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          isDraft: invoice.isDraft,
          worksheetIds: invoice.lineItems
            .filter((item) => item.worksheetId)
            .map((item) => item.worksheetId),
          totalAmount: invoice.totalAmount.toNumber(),
          paymentStatus: invoice.paymentStatus,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          pdfPath,
        },
        `Invoice ${invoice.invoiceNumber} generated successfully`,
        201
      );
    } else {
      // New flexible system - draft or finalized
      const data = await validateRequestBody(
        { json: async () => body } as NextRequest,
        createInvoiceSchema
      );

      const createData = {
        ...data,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      const invoice = await createInvoice(createData, session.user.id);

      const isDraft = invoice.isDraft;

      // Generate PDF for finalized invoices
      let pdfPath = null;
      if (!isDraft && invoice.invoiceNumber) {
        const invoiceWithPDF = await generateInvoicePDF(invoice.id, session.user.id);
        pdfPath = invoiceWithPDF.pdfPath;
      }

      return successResponse(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          isDraft,
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
        },
        isDraft
          ? 'Draft invoice created successfully'
          : `Invoice ${invoice.invoiceNumber} created successfully`,
        201
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
