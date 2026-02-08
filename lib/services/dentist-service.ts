/**
 * Dentist Service
 *
 * Business logic for dentist/clinic management including CRUD operations,
 * filtering, statistics, and business validation.
 * Implements soft delete and active order protection.
 */

import { prisma } from '@/lib/prisma';
import { Dentist, Prisma, AuditAction, OrderStatus } from '@prisma/client';
import {
  CreateDentistDto,
  UpdateDentistDto,
  DentistFilters,
  DentistListResponse,
  DentistDetailResponse,
  DentistStats,
  SimpleDentistDto,
} from '@/types/dentist';

/**
 * Create audit log entry
 */
async function createAuditLog(
  userId: string,
  action: AuditAction,
  entityId: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
  reason?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType: 'Dentist',
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason,
    },
  });
}

/**
 * Get dentists with filtering, pagination, and sorting
 */
export async function getDentists(
  filters: DentistFilters = {}
): Promise<DentistListResponse> {
  const {
    active,
    city,
    search,
    page = 1,
    limit = 20,
    sortBy = 'clinicName',
    sortOrder = 'asc',
  } = filters;

  // Build where clause
  const where: Prisma.DentistWhereInput = {
    deletedAt: null, // Exclude soft-deleted dentists
  };

  if (active !== undefined) {
    where.active = active;
  }

  if (city) {
    where.city = city;
  }

  if (search) {
    where.OR = [
      {
        clinicName: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        dentistName: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  // Build orderBy clause
  const orderBy: Prisma.DentistOrderByWithRelationInput = {};
  orderBy[sortBy] = sortOrder;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [dentists, total] = await Promise.all([
    prisma.dentist.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.dentist.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    dentists,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get single dentist by ID with optional counts
 */
export async function getDentistById(
  id: string,
  includeCounts: boolean = true
): Promise<DentistDetailResponse | null> {
  const dentist = await prisma.dentist.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: includeCounts
      ? {
          _count: {
            select: {
              orders: true,
              worksheets: true,
              invoices: true,
            },
          },
        }
      : undefined,
  });

  return dentist as DentistDetailResponse | null;
}

/**
 * Get active dentists (simple list for dropdowns)
 */
export async function getActiveDentists(): Promise<SimpleDentistDto[]> {
  const dentists = await prisma.dentist.findMany({
    where: {
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      clinicName: true,
      dentistName: true,
      email: true,
      paymentTerms: true,
    },
    orderBy: {
      clinicName: 'asc',
    },
  });

  return dentists;
}

/**
 * Create new dentist/clinic
 */
export async function createDentist(
  data: CreateDentistDto,
  userId: string
): Promise<Dentist> {
  // Validate email uniqueness (only if email provided)
  if (data.email) {
    const existingDentist = await prisma.dentist.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (existingDentist) {
      throw new Error(
        `A dentist with email ${data.email} already exists: ${existingDentist.clinicName}`
      );
    }
  }

  const dentist = await prisma.$transaction(async (tx) => {
    // Create dentist
    const newDentist = await tx.dentist.create({
      data: {
        clinicName: data.clinicName.trim(),
        dentistName: data.dentistName.trim(),
        licenseNumber: data.licenseNumber?.trim() || null,
        email: data.email?.toLowerCase().trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city.trim(),
        postalCode: data.postalCode.trim(),
        country: data.country?.trim() || 'Slovenia',
        taxNumber: data.taxNumber?.trim() || null,
        businessRegistration: data.businessRegistration?.trim() || null,
        paymentTerms: data.paymentTerms ?? 15,
        requiresInvoicing: data.requiresInvoicing !== undefined ? data.requiresInvoicing : true,
        notes: data.notes?.trim() || null,
        active: data.active !== undefined ? data.active : true,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        entityType: 'Dentist',
        entityId: newDentist.id,
        newValues: JSON.stringify({
          clinicName: newDentist.clinicName,
          dentistName: newDentist.dentistName,
          email: newDentist.email,
          city: newDentist.city,
          active: newDentist.active,
        }),
      },
    });

    return newDentist;
  });

  return dentist;
}

/**
 * Update dentist details
 */
export async function updateDentist(
  id: string,
  data: UpdateDentistDto,
  userId: string
): Promise<Dentist> {
  // Get existing dentist
  const existingDentist = await prisma.dentist.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingDentist) {
    throw new Error('Dentist not found');
  }

  // Validate email uniqueness if changing
  if (data.email) {
    const emailExists = await prisma.dentist.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        deletedAt: null,
        NOT: { id },
      },
    });

    if (emailExists) {
      throw new Error(
        `Email ${data.email} is already in use by ${emailExists.clinicName}`
      );
    }
  }

  const dentist = await prisma.$transaction(async (tx) => {
    // Prepare update data
    const updateData: Prisma.DentistUpdateInput = {};

    if (data.clinicName !== undefined) {
      updateData.clinicName = data.clinicName.trim();
    }

    if (data.dentistName !== undefined) {
      updateData.dentistName = data.dentistName.trim();
    }

    if (data.licenseNumber !== undefined) {
      updateData.licenseNumber = data.licenseNumber?.trim() || null;
    }

    if (data.email !== undefined) {
      updateData.email = data.email ? data.email.toLowerCase().trim() : null;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone ? data.phone.trim() : null;
    }

    if (data.address !== undefined) {
      updateData.address = data.address ? data.address.trim() : null;
    }

    if (data.city !== undefined) {
      updateData.city = data.city.trim();
    }

    if (data.postalCode !== undefined) {
      updateData.postalCode = data.postalCode.trim();
    }

    if (data.country !== undefined) {
      updateData.country = data.country.trim();
    }

    if (data.taxNumber !== undefined) {
      updateData.taxNumber = data.taxNumber?.trim() || null;
    }

    if (data.businessRegistration !== undefined) {
      updateData.businessRegistration = data.businessRegistration?.trim() || null;
    }

    if (data.paymentTerms !== undefined) {
      updateData.paymentTerms = data.paymentTerms;
    }

    if (data.requiresInvoicing !== undefined) {
      updateData.requiresInvoicing = data.requiresInvoicing;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    if (data.active !== undefined) {
      updateData.active = data.active;
    }

    // Update dentist
    const updatedDentist = await tx.dentist.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Dentist',
        entityId: updatedDentist.id,
        oldValues: JSON.stringify({
          clinicName: existingDentist.clinicName,
          dentistName: existingDentist.dentistName,
          email: existingDentist.email,
          city: existingDentist.city,
          active: existingDentist.active,
        }),
        newValues: JSON.stringify({
          clinicName: updatedDentist.clinicName,
          dentistName: updatedDentist.dentistName,
          email: updatedDentist.email,
          city: updatedDentist.city,
          active: updatedDentist.active,
        }),
      },
    });

    return updatedDentist;
  });

  return dentist;
}

/**
 * Soft delete dentist with active order protection
 */
export async function deleteDentist(
  id: string,
  userId: string
): Promise<void> {
  // Get existing dentist
  const existingDentist = await prisma.dentist.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingDentist) {
    throw new Error('Dentist not found');
  }

  // Check for active orders (not DELIVERED or CANCELLED)
  const activeOrdersCount = await prisma.order.count({
    where: {
      dentistId: id,
      status: {
        notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      },
    },
  });

  if (activeOrdersCount > 0) {
    throw new Error(
      `Cannot delete dentist with ${activeOrdersCount} active order(s). Please complete or cancel all orders first, or set dentist to inactive instead.`
    );
  }

  // Check for active worksheets (not DELIVERED)
  const activeWorksheetsCount = await prisma.workSheet.count({
    where: {
      dentistId: id,
      status: {
        not: 'DELIVERED',
      },
    },
  });

  if (activeWorksheetsCount > 0) {
    throw new Error(
      `Cannot delete dentist with ${activeWorksheetsCount} active worksheet(s). Please complete all worksheets first, or set dentist to inactive instead.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete
    await tx.dentist.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        entityType: 'Dentist',
        entityId: id,
        oldValues: JSON.stringify({
          clinicName: existingDentist.clinicName,
          dentistName: existingDentist.dentistName,
          email: existingDentist.email,
        }),
        reason: 'Soft deleted',
      },
    });
  });
}

/**
 * Get dentist statistics
 */
export async function getDentistStats(id: string): Promise<DentistStats | null> {
  const dentist = await prisma.dentist.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!dentist) {
    return null;
  }

  // Calculate date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Execute all queries in parallel
  const [
    totalOrders,
    activeOrders,
    completedOrders,
    totalWorksheets,
    activeWorksheets,
    completedWorksheets,
    ordersThisMonth,
    ordersThisYear,
    lastOrder,
    lastWorksheet,
    invoices,
  ] = await Promise.all([
    // Order counts
    prisma.order.count({
      where: { dentistId: id },
    }),
    prisma.order.count({
      where: {
        dentistId: id,
        status: {
          notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        },
      },
    }),
    prisma.order.count({
      where: {
        dentistId: id,
        status: OrderStatus.DELIVERED,
      },
    }),

    // Worksheet counts
    prisma.workSheet.count({
      where: { dentistId: id },
    }),
    prisma.workSheet.count({
      where: {
        dentistId: id,
        status: {
          not: 'DELIVERED',
        },
      },
    }),
    prisma.workSheet.count({
      where: {
        dentistId: id,
        status: 'DELIVERED',
      },
    }),

    // Time-based order counts
    prisma.order.count({
      where: {
        dentistId: id,
        orderDate: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.order.count({
      where: {
        dentistId: id,
        orderDate: {
          gte: startOfYear,
        },
      },
    }),

    // Last order
    prisma.order.findFirst({
      where: { dentistId: id },
      orderBy: { orderDate: 'desc' },
      select: { orderDate: true },
    }),

    // Last worksheet
    prisma.workSheet.findFirst({
      where: { dentistId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),

    // Invoices for revenue calculation (by dentist)
    prisma.invoice.findMany({
      where: {
        dentistId: id,
        paymentStatus: {
          not: 'CANCELLED',
        },
      },
      select: {
        totalAmount: true,
      },
    }),
  ]);

  // Calculate revenue statistics
  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()),
    0
  );

  const averageOrderValue =
    completedOrders > 0 ? totalRevenue / completedOrders : 0;

  return {
    id: dentist.id,
    clinicName: dentist.clinicName,
    dentistName: dentist.dentistName,

    // Order statistics
    totalOrders,
    activeOrders,
    completedOrders,

    // Worksheet statistics
    totalWorksheets,
    activeWorksheets,
    completedWorksheets,

    // Revenue statistics
    totalRevenue,
    averageOrderValue,

    // Time-based statistics
    ordersThisMonth,
    ordersThisYear,

    // Last activity
    lastOrderDate: lastOrder?.orderDate,
    lastWorksheetDate: lastWorksheet?.createdAt,
  };
}

/**
 * Get all orders for a dentist (for detail page)
 */
export async function getDentistOrders(
  dentistId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [orders, total, invoices] = await Promise.all([
    prisma.order.findMany({
      where: { dentistId },
      orderBy: { orderDate: 'desc' },
      skip,
      take: limit,
      include: {
        worksheets: {
          select: {
            id: true,
            worksheetNumber: true,
            status: true,
            products: {
              select: {
                quantity: true,
                priceAtSelection: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc', // Get most recent worksheet first
          },
          take: 1, // Only need the latest worksheet
        },
      },
    }),
    prisma.order.count({ where: { dentistId } }),
    // Get invoices with line items for this dentist
    prisma.invoice.findMany({
      where: { dentistId },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentStatus: true,
        invoiceDate: true,
        lineItems: {
          select: {
            worksheetId: true,
          },
        },
      },
    }),
  ]);

  // Create a map of worksheetId to invoice
  const worksheetInvoiceMap = new Map();
  invoices.forEach(invoice => {
    invoice.lineItems.forEach(lineItem => {
      if (lineItem.worksheetId) {
        worksheetInvoiceMap.set(lineItem.worksheetId, {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          paymentStatus: invoice.paymentStatus,
          invoiceDate: invoice.invoiceDate,
        });
      }
    });
  });

  // Calculate totals for each order
  const ordersWithTotals = orders.map(order => {
    // Get the most recent worksheet (first in array since we ordered by createdAt desc)
    const worksheet = order.worksheets?.[0];

    const totalValue = worksheet?.products.reduce(
      (sum, product) => sum + (Number(product.priceAtSelection) * product.quantity),
      0
    ) || 0;

    const invoice = worksheet ? worksheetInvoiceMap.get(worksheet.id) : null;

    return {
      ...order,
      worksheet, // Include worksheet for frontend compatibility
      totalValue,
      hasInvoice: !!invoice,
      invoiceNumber: invoice?.invoiceNumber || null,
      invoiceStatus: invoice?.paymentStatus || null,
    };
  });

  return {
    orders: ordersWithTotals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all worksheets for a dentist (for detail page)
 * Includes products and materials with LOT tracking
 */
export async function getDentistWorksheets(
  dentistId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [worksheets, total] = await Promise.all([
    prisma.workSheet.findMany({
      where: { dentistId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            orderDate: true,
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
              },
            },
          },
        },
        materials: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            materialLot: {
              select: {
                id: true,
                lotNumber: true,
                expiryDate: true,
              },
            },
          },
        },
        documents: {
          where: {
            type: 'ANNEX_XIII',
          },
          select: {
            id: true,
            type: true,
            generatedAt: true,
            retentionUntil: true,
          },
        },
      },
    }),
    prisma.workSheet.count({ where: { dentistId } }),
  ]);

  return {
    worksheets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get list of all cities (for filter dropdown)
 */
export async function getDentistCities(): Promise<string[]> {
  const cities = await prisma.dentist.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      city: true,
    },
    distinct: ['city'],
    orderBy: {
      city: 'asc',
    },
  });

  return cities.map((c) => c.city);
}

/**
 * Get all invoices for a dentist (for detail page Invoices tab)
 * Includes line items to show worksheet numbers, payment status, and summary metrics
 */
export async function getDentistInvoices(
  dentistId: string,
  page: number = 1,
  limit: number = 20,
  statusFilter?: string
) {
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    dentistId,
    paymentStatus: {
      not: 'CANCELLED',
    },
  };

  // Apply status filter if provided
  if (statusFilter && statusFilter !== 'ALL') {
    where.paymentStatus = statusFilter;
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      skip,
      take: limit,
      include: {
        lineItems: {
          include: {
            worksheet: {
              select: {
                id: true,
                worksheetNumber: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  // Calculate summary metrics
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalOutstanding, paidThisMonth] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        dentistId,
        paymentStatus: {
          notIn: ['PAID', 'CANCELLED', 'DRAFT'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.invoice.aggregate({
      where: {
        dentistId,
        paymentStatus: 'PAID',
        paidAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  // Convert Decimal to number for client
  const invoicesWithNumbers = invoices.map(invoice => ({
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    taxAmount: Number(invoice.taxAmount),
    subtotal: Number(invoice.subtotal),
  }));

  return {
    invoices: invoicesWithNumbers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalOutstanding: Number(totalOutstanding._sum.totalAmount || 0),
      paidThisMonth: Number(paidThisMonth._sum.totalAmount || 0),
    },
  };
}
