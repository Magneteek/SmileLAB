/**
 * Order Service
 *
 * Business logic for Order management with sequential numbering,
 * CRUD operations, filtering, and audit logging.
 */

import { prisma } from '@/lib/prisma';
import {
  Order,
  OrderStatus,
  Prisma,
  AuditAction,
} from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderFilters,
  OrderListResponse,
  OrderWithRelations,
  OrderDetailResponse,
} from '@/types/order';

/**
 * Get next sequential order number from SystemConfig
 * Format: YYXXX (e.g., 26001, 26002, 26003...)
 * YY = last 2 digits of year
 * XXX = 3-digit sequential number (resets each year)
 */
async function getNextOrderNumber(): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const configKey = `next_order_number_${currentYear}`;
    const yearPrefix = currentYear.toString().slice(-2);

    // Get or create the year-specific order number config
    let config = await tx.systemConfig.findUnique({
      where: { key: configKey },
    });

    if (!config) {
      config = await tx.systemConfig.create({
        data: {
          key: configKey,
          value: '1',
          description: `Next sequential order number for year ${currentYear}`,
        },
      });
    }

    let nextSeq = parseInt(config.value, 10);

    // Self-heal: if counter is behind the actual DB max, catch up
    const maxOrder = await tx.order.findFirst({
      where: { orderNumber: { startsWith: yearPrefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    if (maxOrder) {
      const maxSeq = parseInt(maxOrder.orderNumber.slice(yearPrefix.length), 10);
      if (maxSeq >= nextSeq) {
        nextSeq = maxSeq + 1;
      }
    }

    // Update counter for next call
    await tx.systemConfig.update({
      where: { key: configKey },
      data: { value: (nextSeq + 1).toString() },
    });

    const sequentialPart = nextSeq.toString().padStart(3, '0');
    return `${yearPrefix}${sequentialPart}`;
  });

  return result;
}

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
      entityType: 'Order',
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason,
    },
  });
}

/**
 * Get orders with filtering, pagination, and sorting
 */
export async function getOrders(
  filters: OrderFilters = {}
): Promise<OrderListResponse> {
  const {
    status,
    dentistId,
    startDate,
    endDate,
    priority,
    search,
    page = 1,
    limit = 20,
    sortBy = 'orderDate',
    sortOrder = 'desc',
    excludeStatus,
  } = filters;

  // Build where clause
  const where: Prisma.OrderWhereInput = {
    deletedAt: null, // Exclude soft-deleted orders
  };

  if (status) {
    where.status = status;
  }

  // Exclude specific status (e.g., hide INVOICED from TECHNICIAN)
  if (excludeStatus) {
    where.status = { not: excludeStatus };
  }

  if (dentistId) {
    where.dentistId = dentistId;
  }

  if (priority !== undefined) {
    where.priority = priority;
  }

  if (search) {
    where.orderNumber = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (startDate || endDate) {
    where.orderDate = {};
    if (startDate) {
      where.orderDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.orderDate.lte = new Date(endDate);
    }
  }

  // Build orderBy clause
  const orderBy: Prisma.OrderOrderByWithRelationInput = {};
  orderBy[sortBy] = sortOrder;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        dentist: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        worksheets: {
          where: {
            deletedAt: null, // Only active worksheets
          },
          select: {
            id: true,
            worksheetNumber: true,
            revision: true,
            status: true,
            patientName: true,
          },
          orderBy: {
            revision: 'desc',
          },
          take: 1, // Get only the latest revision
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    orders: orders as OrderWithRelations[],
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get single order by ID with full relations
 */
export async function getOrderById(
  id: string
): Promise<OrderDetailResponse | null> {
  const order = await prisma.order.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      dentist: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      worksheets: {
        where: {
          deletedAt: null, // Only active worksheets
        },
        include: {
          teeth: true,
          products: {
            include: {
              product: true,
            },
          },
          materials: {
            include: {
              material: true,
              materialLot: true,
            },
          },
          qualityControls: {
            include: {
              inspector: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          revision: 'desc',
        },
        take: 1, // Get only the latest revision
      },
    },
  });

  return order as OrderDetailResponse | null;
}

/**
 * Create new order with sequential numbering
 */
export async function createOrder(
  data: CreateOrderDto,
  userId: string
): Promise<Order> {
  // Validate dentist exists
  const dentist = await prisma.dentist.findUnique({
    where: { id: data.dentistId },
  });

  if (!dentist || dentist.deletedAt) {
    throw new Error('Dentist not found or inactive');
  }

  const order = await prisma.$transaction(async (tx) => {
    // Get next order number
    const orderNumber = await getNextOrderNumber();

    // Parse dates
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    // Create order
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        dentistId: data.dentistId,
        patientName: data.patientName ?? null,
        createdById: userId,
        dueDate,
        priority: data.priority ?? 0,
        impressionType: (data as any).impressionType ?? 'PHYSICAL_IMPRINT',
        notes: data.notes ?? null,
        status: OrderStatus.PENDING,
      },
      include: {
        dentist: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        entityType: 'Order',
        entityId: newOrder.id,
        newValues: JSON.stringify({
          orderNumber: newOrder.orderNumber,
          dentistId: newOrder.dentistId,
          dueDate: newOrder.dueDate,
          priority: newOrder.priority,
          notes: newOrder.notes,
        }),
      },
    });

    return newOrder;
  });

  return order;
}

/**
 * Update order
 */
export async function updateOrder(
  id: string,
  data: UpdateOrderDto,
  userId: string
): Promise<Order> {
  // Get existing order
  const existingOrder = await prisma.order.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingOrder) {
    throw new Error('Order not found');
  }

  // Validate dentist if changing
  if (data.dentistId) {
    const dentist = await prisma.dentist.findUnique({
      where: { id: data.dentistId },
    });

    if (!dentist || dentist.deletedAt) {
      throw new Error('Dentist not found or inactive');
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    // Prepare update data
    const updateData: Prisma.OrderUpdateInput = {};

    if (data.dentistId !== undefined) {
      updateData.dentist = { connect: { id: data.dentistId } };
    }

    if (data.patientName !== undefined) {
      updateData.patientName = data.patientName;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if ((data as any).impressionType !== undefined) {
      updateData.impressionType = (data as any).impressionType;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Update order
    const updatedOrder = await tx.order.update({
      where: { id },
      data: updateData,
      include: {
        dentist: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Order',
        entityId: updatedOrder.id,
        oldValues: JSON.stringify({
          dentistId: existingOrder.dentistId,
          dueDate: existingOrder.dueDate,
          status: existingOrder.status,
          priority: existingOrder.priority,
          notes: existingOrder.notes,
        }),
        newValues: JSON.stringify({
          dentistId: updatedOrder.dentistId,
          dueDate: updatedOrder.dueDate,
          status: updatedOrder.status,
          priority: updatedOrder.priority,
          notes: updatedOrder.notes,
        }),
      },
    });

    return updatedOrder;
  });

  return order;
}

/**
 * Soft delete order
 */
export async function deleteOrder(
  id: string,
  userId: string
): Promise<void> {
  // Get existing order
  const existingOrder = await prisma.order.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingOrder) {
    throw new Error('Order not found');
  }

  // Check if order has any active worksheets
  const activeWorksheet = await prisma.workSheet.findFirst({
    where: {
      orderId: id,
      deletedAt: null, // Only check for active worksheets
    },
  });

  if (activeWorksheet) {
    throw new Error(
      `Cannot delete order with active worksheet (${activeWorksheet.worksheetNumber} Rev ${activeWorksheet.revision}). Delete worksheet first.`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete
    await tx.order.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        entityType: 'Order',
        entityId: id,
        oldValues: JSON.stringify({
          orderNumber: existingOrder.orderNumber,
          dentistId: existingOrder.dentistId,
          status: existingOrder.status,
        }),
        reason: 'Soft deleted',
      },
    });
  });
}

/**
 * Get order statistics
 */
export async function getOrderStats() {
  const [
    total,
    pending,
    inProduction,
    qcPending,
    qcApproved,
    invoiced,
    delivered,
    cancelled,
  ] = await Promise.all([
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.PENDING },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.IN_PRODUCTION },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.QC_PENDING },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.QC_APPROVED },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.INVOICED },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.DELIVERED },
    }),
    prisma.order.count({
      where: { deletedAt: null, status: OrderStatus.CANCELLED },
    }),
  ]);

  return {
    total,
    pending,
    inProduction,
    qcPending,
    qcApproved,
    invoiced,
    delivered,
    cancelled,
  };
}
