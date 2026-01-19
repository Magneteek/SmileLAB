/**
 * Invoice Service
 * Handles invoice generation, calculation, and management
 */

import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  GenerateInvoiceDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FinalizeInvoiceDto,
  CreateLineItemDto,
  UpdateInvoicePaymentDto,
  InvoiceFilters,
  InvoiceSummary,
  InvoiceCalculation,
  InvoiceWithRelations,
  InvoiceLineItemWithRelations,
  LineItemType,
  PaginatedInvoices,
} from '@/src/types/invoice';
import type { PaginationParams } from '@/src/types/worksheet';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TAX_RATE = 22.00; // Slovenia VAT 22%
const DEFAULT_PAYMENT_TERMS = 30; // 30 days payment terms
const INVOICE_PREFIX = 'RAC-'; // RAC-YYYY-NNN format

// ============================================================================
// INVOICE GENERATION
// ============================================================================

/**
 * Generate invoice from a QC-approved worksheet (Legacy)
 *
 * @deprecated Use createInvoice() with isDraft=false for new implementations
 *
 * This function creates and immediately finalizes an invoice from a single worksheet.
 * For more flexibility (draft mode, multi-worksheet, custom line items), use createInvoice().
 *
 * @param data - Invoice generation data
 * @param userId - User creating the invoice
 * @returns Created and finalized invoice
 */
export async function generateInvoice(
  data: GenerateInvoiceDto,
  userId: string
): Promise<InvoiceWithRelations> {
  console.log('🧾 Generating invoice for worksheet (legacy):', data.worksheetId);

  // Use the new createInvoice function with isDraft=false
  const invoice = await createInvoice(
    {
      worksheetIds: [data.worksheetId],
      dueDate: data.dueDate,
      serviceDate: data.serviceDate,
      issuedBy: data.issuedBy,
      taxRate: data.taxRate,
      notes: data.notes,
      lineItems: [], // Will be populated from worksheet
      isDraft: false, // Create finalized invoice immediately
    },
    userId
  );

  return invoice;
}

/**
 * Calculate invoice amounts from line items
 *
 * @param lineItems - Line items with totalPrice
 * @param taxRate - Tax rate percentage (default 22%)
 * @param discountRate - Discount rate percentage (default 0%)
 * @returns Invoice calculation
 */
export function calculateInvoiceAmounts(
  lineItems: Array<{ totalPrice: number | Decimal }>,
  taxRate: number = DEFAULT_TAX_RATE,
  discountRate: number = 0
): InvoiceCalculation {
  // Calculate subtotal from all line items
  const subtotal = lineItems.reduce((sum, item) => {
    const price = typeof item.totalPrice === 'number'
      ? item.totalPrice
      : item.totalPrice.toNumber();
    return sum + price;
  }, 0);

  // Calculate discount amount
  const discountAmount = (subtotal * discountRate) / 100;

  // Calculate amount after discount
  const amountAfterDiscount = subtotal - discountAmount;

  // Calculate tax amount (on discounted amount)
  const taxAmount = (amountAfterDiscount * taxRate) / 100;

  // Calculate total amount
  const totalAmount = amountAfterDiscount + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountRate: parseFloat(discountRate.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    taxRate: parseFloat(taxRate.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

// ============================================================================
// FLEXIBLE INVOICE CREATION (DRAFT MODE)
// ============================================================================

/**
 * Create a new invoice (draft mode by default)
 *
 * Supports:
 * - Creating empty draft to fill in later
 * - Importing products from QC-approved worksheets
 * - Adding custom line items (shipping, discounts, adjustments)
 * - Multi-worksheet invoices for same dentist
 *
 * @param data - Invoice creation data
 * @param userId - User creating the invoice
 * @returns Created draft invoice
 */
export async function createInvoice(
  data: CreateInvoiceDto,
  userId: string
): Promise<InvoiceWithRelations> {
  console.log('📝 Creating invoice draft:', data);

  // Validate: If worksheet IDs provided, fetch worksheet data
  const worksheets = data.worksheetIds && data.worksheetIds.length > 0
    ? await prisma.workSheet.findMany({
        where: {
          id: { in: data.worksheetIds },
          status: 'QC_APPROVED', // Only QC-approved worksheets
        },
        include: {
          dentist: true,
          order: {
            include: {
              dentist: true,
            },
          },
          products: {
            include: {
              product: true,
            },
          },
        },
      })
    : [];

  // Validate all worksheets exist and belong to same dentist
  if (data.worksheetIds && worksheets.length !== data.worksheetIds.length) {
    throw new Error('One or more worksheets not found or not QC-approved');
  }

  const dentistId = data.dentistId || worksheets[0]?.dentist.id;
  if (!dentistId) {
    throw new Error('Dentist ID is required when not importing from worksheets');
  }

  // Ensure all worksheets belong to same dentist
  const allSameDentist = worksheets.every(ws => ws.dentist.id === dentistId);
  if (!allSameDentist) {
    throw new Error('All worksheets must belong to the same dentist');
  }

  // Get dentist payment terms
  const dentist = worksheets[0]?.dentist || await prisma.dentist.findUnique({
    where: { id: dentistId },
  });

  if (!dentist) {
    throw new Error('Dentist not found');
  }

  const paymentTerms = dentist.paymentTerms || DEFAULT_PAYMENT_TERMS;
  const invoiceDate = data.invoiceDate || new Date();
  const dueDate = data.dueDate || new Date(invoiceDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000);
  const serviceDate = data.serviceDate || invoiceDate; // Default to invoice date
  const issuedBy = data.issuedBy || 'Rommy Balzan Verbič'; // Default issuer

  // Prepare line items
  const lineItemsToCreate: Array<Omit<CreateLineItemDto, 'position'> & { position: number }> = [
    ...data.lineItems.map((item, index) => ({
      ...item,
      position: item.position ?? index,
    })),
  ];

  // Import worksheet products if provided
  if (worksheets.length > 0) {
    let position = lineItemsToCreate.length;
    for (const worksheet of worksheets) {
      for (const wsProduct of worksheet.products) {
        lineItemsToCreate.push({
          worksheetId: worksheet.id,
          description: `${wsProduct.product.code} - ${wsProduct.product.name}`,
          quantity: wsProduct.quantity,
          unitPrice: wsProduct.priceAtSelection.toNumber(),
          lineType: 'product' as LineItemType,
          productCode: wsProduct.product.code,
          productName: wsProduct.product.name,
          notes: wsProduct.notes || undefined,
          position: position++,
        });
      }
    }
  }

  // Calculate amounts
  const calculation = calculateInvoiceAmounts(
    lineItemsToCreate.map(item => ({ totalPrice: item.quantity * item.unitPrice })),
    data.taxRate ?? DEFAULT_TAX_RATE,      // FIX: Use ?? instead of || to allow 0
    data.discountRate ?? 0                  // FIX: Pass discountRate parameter
  );

  // Generate invoice number if not draft
  const isDraft = data.isDraft ?? true;
  const invoiceNumber = !isDraft ? await generateInvoiceNumber(invoiceDate) : null;

  // Create invoice in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        createdById: userId,
        dentistId,
        invoiceDate,
        dueDate,
        serviceDate,
        issuedBy,
        isDraft,
        invoiceNumber,
        paymentReference: invoiceNumber || undefined, // Set payment reference if finalized
        subtotal: new Decimal(calculation.subtotal.toFixed(2)),
        discountRate: new Decimal(calculation.discountRate.toFixed(2)),     // FIX: Save discount rate
        discountAmount: new Decimal(calculation.discountAmount.toFixed(2)), // FIX: Save discount amount
        taxRate: new Decimal(calculation.taxRate.toFixed(2)),               // FIX: Use ?? instead of ||
        taxAmount: new Decimal(calculation.taxAmount.toFixed(2)),
        totalAmount: new Decimal(calculation.totalAmount.toFixed(2)),
        paymentStatus: isDraft ? 'DRAFT' : 'FINALIZED', // FIX: Use FINALIZED when not draft
        notes: data.notes || null,
      },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
        },
        createdBy: true,
        emailLogs: true,
      },
    });

    // Create line items
    if (lineItemsToCreate.length > 0) {
      await tx.invoiceLineItem.createMany({
        data: lineItemsToCreate.map(item => ({
          invoiceId: newInvoice.id,
          worksheetId: item.worksheetId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: new Decimal(item.unitPrice.toFixed(2)),
          totalPrice: new Decimal((item.quantity * item.unitPrice).toFixed(2)),
          lineType: item.lineType || 'product',
          productCode: item.productCode || null,
          productName: item.productName || null,
          notes: item.notes || null,
          position: item.position,
        })),
      });
    }

    // If not draft, update worksheet and order statuses (worksheets to DELIVERED, orders to INVOICED)
    if (!isDraft && data.worksheetIds && data.worksheetIds.length > 0) {
      console.log(`📋 Updating ${data.worksheetIds.length} worksheet(s) to DELIVERED status`);

      // Update worksheets
      const worksheetUpdate = await tx.workSheet.updateMany({
        where: {
          id: { in: data.worksheetIds },
        },
        data: {
          status: 'DELIVERED',
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Updated ${worksheetUpdate.count} worksheet(s) to DELIVERED status`);

      // Update related orders
      const orderIds = worksheets
        .filter(ws => ws.orderId)
        .map(ws => ws.orderId!);

      if (orderIds.length > 0) {
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            status: 'INVOICED',
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Updated ${orderUpdate.count} order(s) to INVOICED status`);
      }
    }

    // Fetch complete invoice with line items
    const completeInvoice = await tx.invoice.findUnique({
      where: { id: newInvoice.id },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        createdBy: true,
        emailLogs: true,
      },
    });

    return completeInvoice!;
  });

  if (isDraft) {
    console.log('✅ Invoice draft created:', invoice.id);
  } else {
    console.log('✅ Invoice finalized and created:', invoiceNumber);
  }
  return invoice;
}

/**
 * Update a draft invoice
 *
 * @param invoiceId - Invoice ID
 * @param data - Update data
 * @returns Updated invoice
 */
export async function updateInvoice(
  invoiceId: string,
  data: UpdateInvoiceDto
): Promise<InvoiceWithRelations> {
  console.log('✏️ Updating invoice draft:', invoiceId);

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });

  if (!existing) {
    throw new Error('Invoice not found');
  }

  if (!existing.isDraft) {
    throw new Error('Cannot update finalized invoice. Payment status updates use updateInvoicePayment()');
  }

  // Calculate new amounts if line items changed
  let calculation: InvoiceCalculation | undefined;
  if (data.lineItems) {
    calculation = calculateInvoiceAmounts(
      data.lineItems.map(item => ({ totalPrice: item.quantity * item.unitPrice })),
      data.taxRate !== undefined ? data.taxRate : existing.taxRate.toNumber(),
      data.discountRate !== undefined ? data.discountRate : existing.discountRate?.toNumber() || 0
    );
  }

  // Update invoice
  const invoice = await prisma.$transaction(async (tx) => {
    // Update invoice fields
    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        serviceDate: data.serviceDate,
        issuedBy: data.issuedBy,
        taxRate: data.taxRate !== undefined ? new Decimal(data.taxRate.toFixed(2)) : undefined,
        discountRate: data.discountRate !== undefined ? new Decimal(data.discountRate.toFixed(2)) : undefined,
        subtotal: calculation ? new Decimal(calculation.subtotal.toFixed(2)) : undefined,
        taxAmount: calculation ? new Decimal(calculation.taxAmount.toFixed(2)) : undefined,
        discountAmount: calculation ? new Decimal(calculation.discountAmount.toFixed(2)) : undefined,
        totalAmount: calculation ? new Decimal(calculation.totalAmount.toFixed(2)) : undefined,
        notes: data.notes,
        updatedAt: new Date(),
      },
    });

    // If line items provided, replace all
    if (data.lineItems) {
      // Delete existing line items
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId },
      });

      // Create new line items
      if (data.lineItems.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: data.lineItems.map((item, index) => ({
            invoiceId,
            worksheetId: item.worksheetId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice.toFixed(2)),
            totalPrice: new Decimal((item.quantity * item.unitPrice).toFixed(2)),
            lineType: item.lineType || 'product',
            productCode: item.productCode || null,
            productName: item.productName || null,
            notes: item.notes || null,
            position: item.position ?? index,
          })),
        });
      }
    }

    // Fetch complete invoice
    return await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        createdBy: true,
        emailLogs: true,
      },
    });
  });

  console.log('✅ Invoice updated:', invoiceId);
  return invoice!;
}

/**
 * Finalize an invoice (assign invoice number and lock for editing)
 *
 * Process:
 * 1. Validate invoice is in draft status
 * 2. Generate invoice number based on invoice date (RAC-YYYY-NNN)
 * 3. Set isDraft to false
 * 4. Update related worksheets to DELIVERED status
 *
 * @param invoiceId - Invoice ID
 * @param data - Finalization data (optional date adjustment)
 * @returns Finalized invoice
 */
export async function finalizeInvoice(
  invoiceId: string,
  data?: FinalizeInvoiceDto
): Promise<InvoiceWithRelations> {
  console.log('🔒 Finalizing invoice:', invoiceId);

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: {
        include: {
          worksheet: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Invoice not found');
  }

  if (!existing.isDraft) {
    throw new Error('Invoice is already finalized');
  }

  if (existing.lineItems.length === 0) {
    throw new Error('Cannot finalize invoice with no line items');
  }

  // Use provided date or existing date
  const invoiceDate = data?.invoiceDate || existing.invoiceDate;

  // Generate invoice number based on invoice date
  const invoiceNumber = await generateInvoiceNumber(invoiceDate);

  // Finalize in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    // Update invoice
    const finalized = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        invoiceNumber,
        paymentReference: invoiceNumber, // Same as invoice number for bank transfers
        invoiceDate,
        isDraft: false,
        paymentStatus: 'FINALIZED', // Change from DRAFT to FINALIZED when finalized (ready to send)
        updatedAt: new Date(),
      },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        createdBy: true,
        emailLogs: true,
      },
    });

    // Update all related worksheets to DELIVERED status
    const worksheetIds = finalized.lineItems
      .filter(item => item.worksheetId)
      .map(item => item.worksheetId!);

    console.log(`📋 Found ${worksheetIds.length} worksheet(s) to update:`, worksheetIds);

    if (worksheetIds.length > 0) {
      const worksheetUpdate = await tx.workSheet.updateMany({
        where: {
          id: { in: worksheetIds },
        },
        data: {
          status: 'DELIVERED',
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Updated ${worksheetUpdate.count} worksheet(s) to DELIVERED status`);

      // Also update related orders to INVOICED status
      const orderIds = finalized.lineItems
        .filter(item => item.worksheet?.orderId)
        .map(item => item.worksheet!.orderId!);

      console.log(`📋 Found ${orderIds.length} order(s) to update:`, orderIds);

      if (orderIds.length > 0) {
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            status: 'INVOICED',
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Updated ${orderUpdate.count} order(s) to INVOICED status`);
      }
    }

    console.log('📊 Finalized invoice data:', {
      id: finalized.id,
      isDraft: finalized.isDraft,
      paymentStatus: finalized.paymentStatus,
      invoiceNumber: finalized.invoiceNumber,
    });

    return finalized;
  });

  console.log('✅ Invoice finalized:', invoiceNumber);
  return invoice;
}

/**
 * Generate sequential invoice number based on invoice date (RAC-YYYY-NNN format)
 *
 * @param invoiceDate - The invoice date to determine year and sequence
 * @returns Next invoice number for that year (e.g., RAC-2025-001)
 */
async function generateInvoiceNumber(invoiceDate: Date): Promise<string> {
  const year = invoiceDate.getFullYear();
  const yearPrefix = `${INVOICE_PREFIX}${year}-`;

  // Get the latest invoice number for this year
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: yearPrefix,
      },
      isDraft: false, // Only count finalized invoices
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  if (!latestInvoice) {
    // First invoice for this year
    return `${yearPrefix}001`;
  }

  // Extract number from latest invoice (e.g., "RAC-2025-042" -> 42)
  // invoiceNumber is guaranteed non-null due to query filter
  const numberPart = latestInvoice.invoiceNumber!.replace(yearPrefix, '');
  const latestNumber = parseInt(numberPart, 10);

  // Increment and format with leading zeros
  const nextNumber = latestNumber + 1;
  return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
}

// ============================================================================
// INVOICE RETRIEVAL
// ============================================================================

/**
 * Get invoice by ID with all relations
 *
 * @param invoiceId - Invoice ID
 * @returns Invoice with relations or null
 */
export async function getInvoiceById(
  invoiceId: string
): Promise<InvoiceWithRelations | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      dentist: true,
      lineItems: {
        include: {
          worksheet: {
            include: {
              order: {
                include: {
                  dentist: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
      createdBy: true,
      emailLogs: true,
    },
  });

  return invoice;
}

/**
 * Get invoices for a worksheet
 *
 * Note: A worksheet can appear on multiple invoices via line items
 *
 * @param worksheetId - Worksheet ID
 * @returns Array of invoices containing this worksheet
 */
export async function getInvoicesByWorksheetId(
  worksheetId: string
): Promise<InvoiceWithRelations[]> {
  // Find all invoices that have line items referencing this worksheet
  const invoices = await prisma.invoice.findMany({
    where: {
      lineItems: {
        some: {
          worksheetId,
        },
      },
    },
    include: {
      dentist: true,
      lineItems: {
        include: {
          worksheet: {
            include: {
              order: {
                include: {
                  dentist: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
      createdBy: true,
      emailLogs: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return invoices;
}

/**
 * Check if a worksheet has any invoices and get their payment status
 *
 * Used for cancellation warnings and blocking logic
 *
 * @param worksheetId - Worksheet ID
 * @returns Invoice status information or null if no invoices
 */
export async function checkWorksheetInvoiceStatus(
  worksheetId: string
): Promise<{
  hasInvoice: boolean;
  invoiceCount: number;
  hasPaidInvoice: boolean;
  hasSentInvoice: boolean;
  hasActiveInvoice: boolean; // SENT, PAID, or VIEWED (not DRAFT or CANCELLED)
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    paymentStatus: string;
    isDraft: boolean;
  }>;
} | null> {
  // Find all invoices that have line items referencing this worksheet
  const invoices = await prisma.invoice.findMany({
    where: {
      lineItems: {
        some: {
          worksheetId,
        },
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      paymentStatus: true,
      isDraft: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (invoices.length === 0) {
    return null;
  }

  const hasPaidInvoice = invoices.some(inv => inv.paymentStatus === 'PAID');
  const hasSentInvoice = invoices.some(inv => inv.paymentStatus === 'SENT');
  const hasActiveInvoice = invoices.some(
    inv => !inv.isDraft && inv.paymentStatus !== 'CANCELLED'
  );

  return {
    hasInvoice: true,
    invoiceCount: invoices.length,
    hasPaidInvoice,
    hasSentInvoice,
    hasActiveInvoice,
    invoices: invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      paymentStatus: inv.paymentStatus,
      isDraft: inv.isDraft,
    })),
  };
}

/**
 * List invoices with filters and pagination
 *
 * @param filters - Filter criteria
 * @param pagination - Pagination params
 * @returns Paginated invoices
 */
export async function listInvoices(
  filters: InvoiceFilters = {},
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<PaginatedInvoices> {
  const { page, limit, sortBy = 'invoiceDate', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (filters.paymentStatus) {
    where.paymentStatus = Array.isArray(filters.paymentStatus)
      ? { in: filters.paymentStatus }
      : filters.paymentStatus;
  }

  if (filters.dentistId) {
    where.dentistId = filters.dentistId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.invoiceDate = {};
    if (filters.dateFrom) {
      where.invoiceDate.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.invoiceDate.lte = filters.dateTo;
    }
  }

  if (filters.overdue) {
    where.paymentStatus = { not: 'PAID' };
    where.dueDate = { lt: new Date() };
  }

  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
      {
        dentist: {
          clinicName: { contains: filters.search, mode: 'insensitive' },
        },
      },
      {
        dentist: {
          dentistName: { contains: filters.search, mode: 'insensitive' },
        },
      },
      {
        lineItems: {
          some: {
            worksheet: {
              worksheetNumber: { contains: filters.search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  // Fetch invoices
  const [invoices, total, statusCounts] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              select: {
                id: true,
                worksheetNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
    // Get summary counts
    prisma.invoice.groupBy({
      by: ['paymentStatus'],
      _count: true,
    }),
  ]);

  // Map to summary format
  const data: InvoiceSummary[] = invoices.map((invoice) => {
    const isOverdue =
      invoice.paymentStatus !== 'PAID' &&
      invoice.dueDate &&
      invoice.dueDate < new Date();

    // Collect unique worksheet data from line items (id and number for proper linking)
    const worksheetMap = new Map<string, { id: string; number: string }>();
    invoice.lineItems
      .filter(item => item.worksheet)
      .forEach(item => {
        const ws = item.worksheet!;
        worksheetMap.set(ws.id, { id: ws.id, number: ws.worksheetNumber });
      });
    const worksheets = Array.from(worksheetMap.values());
    const worksheetNumbers = worksheets.map(ws => ws.number);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      worksheetNumbers,
      worksheets, // Include both ID and number for proper linking
      dentistName: invoice.dentist?.dentistName || 'Unknown',
      clinicName: invoice.dentist?.clinicName || 'Unknown',
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      totalAmount: invoice.totalAmount.toNumber(),
      paymentStatus: invoice.paymentStatus as any,
      isDraft: invoice.isDraft,
      overdue: isOverdue || false,
      createdAt: invoice.createdAt,
    };
  });

  // Calculate summary
  const summary = {
    totalDraft: statusCounts.find((s) => s.paymentStatus === 'DRAFT')?._count || 0,
    totalSent: statusCounts.find((s) => s.paymentStatus === 'SENT')?._count || 0,
    totalPaid: statusCounts.find((s) => s.paymentStatus === 'PAID')?._count || 0,
    totalOverdue: data.filter((inv) => inv.overdue).length,
    totalUnpaid:
      (statusCounts.find((s) => s.paymentStatus === 'DRAFT')?._count || 0) +
      (statusCounts.find((s) => s.paymentStatus === 'SENT')?._count || 0) +
      (statusCounts.find((s) => s.paymentStatus === 'VIEWED')?._count || 0),
  };

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  };
}

// ============================================================================
// INVOICE UPDATES
// ============================================================================

/**
 * Update invoice payment status
 *
 * @param invoiceId - Invoice ID
 * @param data - Payment update data
 * @returns Updated invoice
 */
export async function updateInvoicePayment(
  invoiceId: string,
  data: UpdateInvoicePaymentDto
): Promise<InvoiceWithRelations> {
  console.log('💳 Updating invoice payment:', invoiceId, data.paymentStatus);

  // Validate: Cannot change finalized invoice back to DRAFT
  // This prevents gaps in sequential invoice numbering
  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, invoiceNumber: true, isDraft: true, paymentStatus: true },
  });

  if (!existing) {
    throw new Error('Invoice not found');
  }

  // Prevent changing finalized invoices (those with invoice numbers) back to DRAFT
  if (existing.invoiceNumber && !existing.isDraft && data.paymentStatus === 'DRAFT') {
    throw new Error(
      'Cannot change finalized invoice back to DRAFT status. ' +
      'Finalized invoices have sequential invoice numbers that cannot be reused. ' +
      'Use CANCELLED status instead if needed.'
    );
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: data.paymentStatus,
      paidAt: data.paidAt || (data.paymentStatus === 'PAID' ? new Date() : null),
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || undefined,
      updatedAt: new Date(),
    },
    include: {
      dentist: true,
      lineItems: {
        include: {
          worksheet: {
            select: {
              id: true,
              worksheetNumber: true,
              patientName: true,
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
      createdBy: true,
      emailLogs: true,
    },
  });

  console.log('✅ Invoice payment updated:', invoice.invoiceNumber);
  return invoice;
}

/**
 * Mark invoice as sent (update status and track email)
 *
 * @param invoiceId - Invoice ID
 * @returns Updated invoice
 */
export async function markInvoiceAsSent(
  invoiceId: string
): Promise<InvoiceWithRelations> {
  return updateInvoicePayment(invoiceId, {
    paymentStatus: 'SENT' as any,
  });
}

/**
 * Cancel invoice (soft delete)
 *
 * Cancels an invoice and reverts all associated worksheets to QC_APPROVED status,
 * making them available for re-invoicing.
 *
 * @param invoiceId - Invoice ID
 * @returns Updated invoice
 */
export async function cancelInvoice(
  invoiceId: string
): Promise<InvoiceWithRelations> {
  console.log('❌ Cancelling invoice:', invoiceId);

  // Fetch invoice with line items to get worksheet IDs
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: {
        where: {
          worksheetId: { not: null },
        },
        select: {
          worksheetId: true,
        },
      },
    },
  });

  if (!existingInvoice) {
    throw new Error('Invoice not found');
  }

  // Cancel invoice and revert worksheet statuses in transaction
  const invoice = await prisma.$transaction(async (tx) => {
    // Update invoice to CANCELLED
    const canceledInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentStatus: 'CANCELLED',
        updatedAt: new Date(),
      },
      include: {
        dentist: true,
        lineItems: {
          include: {
            worksheet: {
              include: {
                order: {
                  include: {
                    dentist: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        createdBy: true,
        emailLogs: true,
      },
    });

    // Revert all related worksheets to QC_APPROVED status
    const worksheetIds = existingInvoice.lineItems
      .filter((item) => item.worksheetId)
      .map((item) => item.worksheetId!);

    if (worksheetIds.length > 0) {
      await tx.workSheet.updateMany({
        where: {
          id: { in: worksheetIds },
          status: 'DELIVERED', // Only revert if currently DELIVERED
        },
        data: {
          status: 'QC_APPROVED',
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Reverted ${worksheetIds.length} worksheet(s) to QC_APPROVED status`
      );

      // Also revert related orders to QC_APPROVED status
      const orderIds = canceledInvoice.lineItems
        .filter((item) => item.worksheet?.orderId)
        .map((item) => item.worksheet!.orderId!);

      if (orderIds.length > 0) {
        const updatedOrders = await tx.order.updateMany({
          where: {
            id: { in: orderIds },
            status: 'INVOICED', // Only revert if currently INVOICED
          },
          data: {
            status: 'QC_APPROVED',
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ Reverted ${updatedOrders.count} order(s) to QC_APPROVED status`
        );
      }
    }

    return canceledInvoice;
  });

  console.log('✅ Invoice cancelled:', invoice.invoiceNumber);
  return invoice;
}

/**
 * Delete draft invoice (hard delete)
 *
 * Permanently deletes a draft invoice and all its line items.
 * This makes the associated worksheets available for invoicing again.
 *
 * IMPORTANT: Only draft invoices can be deleted. Finalized invoices
 * must be cancelled instead (for audit trail purposes).
 *
 * @param invoiceId - Invoice ID
 * @throws Error if invoice is not a draft or not found
 */
export async function deleteDraftInvoice(invoiceId: string): Promise<void> {
  console.log('🗑️  Deleting draft invoice:', invoiceId);

  // First, fetch the invoice to verify it's a draft
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      isDraft: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (!invoice.isDraft) {
    throw new Error(
      'Cannot delete finalized invoice. Use cancel operation instead.'
    );
  }

  // Delete invoice and line items in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete all line items first (foreign key constraint)
    await tx.invoiceLineItem.deleteMany({
      where: { invoiceId },
    });

    // Delete the invoice
    await tx.invoice.delete({
      where: { id: invoiceId },
    });

    console.log(
      `✅ Draft invoice deleted: ${invoice.invoiceNumber} (ID: ${invoiceId})`
    );
    console.log('   Associated worksheets are now available for invoicing again');
  });
}

/**
 * Delete cancelled invoice (hard delete)
 *
 * Permanently deletes a cancelled invoice and all its line items.
 * Also reverts any related worksheets back to QC_APPROVED status.
 * This is useful for cleanup of cancelled invoices.
 *
 * IMPORTANT: Only CANCELLED invoices can be deleted. Active invoices
 * must be cancelled first. This function ensures worksheets are reverted
 * even for old cancelled invoices (before the reversion fix).
 *
 * @param invoiceId - Invoice ID
 * @throws Error if invoice is not cancelled or not found
 */
export async function deleteCanceledInvoice(invoiceId: string): Promise<void> {
  console.log('🗑️  Deleting cancelled invoice:', invoiceId);

  // Fetch the invoice with line items to get worksheet IDs
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      paymentStatus: true,
      pdfPath: true,
      lineItems: {
        where: { worksheetId: { not: null } },
        select: { worksheetId: true },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.paymentStatus !== 'CANCELLED') {
    throw new Error(
      'Cannot delete active invoice. Cancel it first using cancel operation.'
    );
  }

  // Extract unique worksheet IDs
  const worksheetIds = invoice.lineItems
    .filter((item) => item.worksheetId)
    .map((item) => item.worksheetId!);

  console.log(`📋 Found ${worksheetIds.length} worksheets to revert`);

  // Delete invoice, line items, and revert worksheets + orders in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Revert worksheets to QC_APPROVED (if they're still DELIVERED)
    if (worksheetIds.length > 0) {
      const updatedWorksheets = await tx.workSheet.updateMany({
        where: {
          id: { in: worksheetIds },
          status: 'DELIVERED', // Only update if still in DELIVERED status
        },
        data: {
          status: 'QC_APPROVED',
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Reverted ${updatedWorksheets.count} worksheet(s) to QC_APPROVED`
      );

      // Also revert related orders to QC_APPROVED (fetch order IDs from worksheets)
      const worksheets = await tx.workSheet.findMany({
        where: { id: { in: worksheetIds } },
        select: { orderId: true },
      });

      const orderIds = worksheets
        .filter((ws) => ws.orderId)
        .map((ws) => ws.orderId!);

      if (orderIds.length > 0) {
        const updatedOrders = await tx.order.updateMany({
          where: {
            id: { in: orderIds },
            status: 'INVOICED', // Only revert if currently INVOICED
          },
          data: {
            status: 'QC_APPROVED',
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ Reverted ${updatedOrders.count} order(s) to QC_APPROVED`
        );
      }
    }

    // 2. Delete all line items (foreign key constraint)
    await tx.invoiceLineItem.deleteMany({
      where: { invoiceId },
    });

    // 3. Delete the invoice
    await tx.invoice.delete({
      where: { id: invoiceId },
    });

    console.log(
      `✅ Cancelled invoice deleted: ${invoice.invoiceNumber} (ID: ${invoiceId})`
    );
  });

  // Delete PDF file from disk (outside transaction)
  if (invoice.pdfPath) {
    try {
      const fs = require('fs').promises;
      await fs.unlink(invoice.pdfPath);
      console.log(`✅ Deleted PDF file: ${invoice.pdfPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not delete PDF file: ${invoice.pdfPath}`, error);
      // Don't throw - invoice is already deleted from database
    }
  }
}
