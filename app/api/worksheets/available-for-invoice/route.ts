/**
 * Available Worksheets API Route
 *
 * GET /api/worksheets/available-for-invoice - Get QC-approved worksheets for invoicing
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/worksheets/available-for-invoice
// ============================================================================

/**
 * GET /api/worksheets/available-for-invoice
 * Get worksheets that are QC-approved and available for invoicing
 *
 * Required permissions: Authenticated user
 *
 * Query parameters:
 * - dentistId: string (optional) - Filter by specific dentist
 *
 * Returns worksheets with:
 * - Status: QC_APPROVED
 * - No existing finalized invoice
 * - At least one product assigned
 *
 * Response:
 * [
 *   {
 *     id: "worksheet_123",
 *     worksheetNumber: "DN-001",
 *     dentistId: "dentist_456",
 *     dentistName: "Dr. Smith",
 *     clinicName: "Smith Dental Clinic",
 *     patientName: "John Doe",
 *     products: [...],
 *     totalAmount: 1250.00,
 *     manufactureDate: "2025-01-15T00:00:00.000Z",
 *     hasDraftInvoice: false
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    const { searchParams } = new URL(request.url);

    // Parse filters
    const dentistId = searchParams.get('dentistId');

    // Build where clause
    const where: any = {
      status: 'QC_APPROVED',
      dentist: {
        requiresInvoicing: true, // Only show dentists that need invoices
      },
      products: {
        some: {}, // At least one product
      },
    };

    if (dentistId) {
      where.dentistId = dentistId;
    }

    // Debug logging
    console.log('[Available Worksheets] Query filters:', {
      status: where.status,
      dentistId: dentistId || 'ALL',
      hasProductsFilter: !!where.products,
    });

    // Fetch available worksheets
    let worksheets;
    try {
      worksheets = await prisma.workSheet.findMany({
        where,
        include: {
          dentist: {
            select: {
              id: true,
              dentistName: true,
              clinicName: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              dueDate: true,
            },
          },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  unit: true,
                },
              },
            },
          },
          invoiceLineItems: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  isDraft: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (prismaError) {
      console.error('Prisma query error in available-for-invoice:', prismaError);
      throw new Error(`Database query failed: ${prismaError instanceof Error ? prismaError.message : 'Unknown error'}`);
    }

    console.log('[Available Worksheets] Found worksheets from DB:', worksheets.length);

    // Debug: Log all worksheets with their invoice line items
    worksheets.forEach((ws) => {
      console.log(`[Worksheet Debug] ${ws.worksheetNumber}:`, {
        id: ws.id,
        status: ws.status,
        invoiceLineItemsCount: ws.invoiceLineItems.length,
        invoiceLineItems: ws.invoiceLineItems.map((item) => ({
          id: item.id,
          invoiceId: item.invoiceId,
          invoiceNumber: item.invoice?.invoiceNumber || 'NULL',
          isDraft: item.invoice?.isDraft,
        })),
      });
    });

    // Filter out worksheets that have finalized invoices
    // (worksheets with only draft invoices are still available)
    const availableWorksheets = worksheets.filter((worksheet) => {
      const finalizedInvoices = worksheet.invoiceLineItems.filter(
        (item) => item.invoice && !item.invoice.isDraft
      );

      // Debug logging for filtered worksheets
      if (finalizedInvoices.length > 0) {
        console.log(`[Filtered Out] ${worksheet.worksheetNumber} has ${finalizedInvoices.length} finalized invoice(s)`);
      }

      return finalizedInvoices.length === 0;
    });

    console.log('[Available Worksheets] After filtering finalized invoices:', availableWorksheets.length);

    // Transform response
    const result = availableWorksheets.map((worksheet) => {
      const totalAmount = worksheet.products.reduce((sum, item) => {
        return sum + item.quantity * item.priceAtSelection.toNumber();
      }, 0);

      const hasDraftInvoice = worksheet.invoiceLineItems.some(
        (item) => item.invoice.isDraft
      );

      return {
        id: worksheet.id,
        worksheetNumber: worksheet.worksheetNumber,
        dentistId: worksheet.dentistId,
        dentistName: worksheet.dentist.dentistName,
        clinicName: worksheet.dentist.clinicName,
        patientName: worksheet.patientName,
        orderNumber: worksheet.order.orderNumber,
        dueDate: worksheet.order.dueDate,
        manufactureDate: worksheet.manufactureDate,
        products: worksheet.products.map((item) => ({
          id: item.id,
          productId: item.productId,
          productCode: item.product.code,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unitPrice: item.priceAtSelection.toNumber(),
          totalPrice: item.quantity * item.priceAtSelection.toNumber(),
          unit: item.product.unit,
        })),
        productCount: worksheet.products.length,
        totalAmount,
        hasDraftInvoice,
        createdAt: worksheet.createdAt,
      };
    });

    return successResponse({
      data: result,
      count: result.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
