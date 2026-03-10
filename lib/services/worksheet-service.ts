/**
 * Worksheet Service
 * Core business logic for worksheet operations
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type WorksheetStatus =
  | 'DRAFT'
  | 'IN_PRODUCTION'
  | 'QC_PENDING'
  | 'QC_APPROVED'
  | 'QC_REJECTED'
  | 'INVOICED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'VOIDED';

// Valid status transitions
const STATUS_TRANSITIONS: Record<WorksheetStatus, WorksheetStatus[]> = {
  DRAFT: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['QC_PENDING', 'CANCELLED'],
  QC_PENDING: ['QC_APPROVED', 'QC_REJECTED'],
  QC_APPROVED: ['INVOICED', 'IN_PRODUCTION'],
  QC_REJECTED: ['IN_PRODUCTION', 'CANCELLED'],
  INVOICED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  VOIDED: [],
};

// ============================================================================
// GET WORKSHEET BY ID
// ============================================================================

export async function getWorksheetById(id: string) {
  return prisma.workSheet.findFirst({
    where: { id, deletedAt: null },
    include: {
      order: { select: { id: true, orderNumber: true, dueDate: true, status: true } },
      dentist: { select: { id: true, clinicName: true, dentistName: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      teeth: true,
      products: {
        include: {
          product: true,
          productMaterials: {
            include: { material: true, materialLot: true },
          },
        },
      },
      materials: {
        include: { material: true, materialLot: true },
      },
      qualityControls: {
        include: { inspector: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      designPartner: { select: { id: true, name: true } },
      millingPartner: { select: { id: true, name: true } },
    },
  });
}

// ============================================================================
// GET WORKSHEETS (LIST)
// ============================================================================

export async function getWorksheets(
  filters: {
    status?: WorksheetStatus | WorksheetStatus[];
    dentistId?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
  pagination: { page: number; limit: number }
) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };

  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }
  if (filters.dentistId) where.dentistId = filters.dentistId;
  if (filters.search) {
    where.OR = [
      { worksheetNumber: { contains: filters.search, mode: 'insensitive' } },
      { patientName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }

  const [total, worksheets] = await Promise.all([
    prisma.workSheet.count({ where }),
    prisma.workSheet.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true, dueDate: true } },
        dentist: { select: { id: true, clinicName: true, dentistName: true } },
        products: { include: { product: true }, take: 3 },
      },
    }),
  ]);

  return { worksheets, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ============================================================================
// UPDATE WORKSHEET FIELDS
// ============================================================================

export async function updateWorksheet(
  id: string,
  data: {
    deviceDescription?: string | null;
    intendedUse?: string | null;
    technicalNotes?: string | null;
    qcNotes?: string | null;
    manufactureDate?: string | null;
  },
  userId: string
) {
  const worksheet = await prisma.workSheet.findFirst({
    where: { id, deletedAt: null },
  });
  if (!worksheet) throw new Error('Worksheet not found');

  const updated = await prisma.workSheet.update({
    where: { id },
    data: {
      deviceDescription: data.deviceDescription ?? undefined,
      intendedUse: data.intendedUse ?? undefined,
      technicalNotes: data.technicalNotes ?? undefined,
      qcNotes: data.qcNotes ?? undefined,
      manufactureDate: data.manufactureDate ? new Date(data.manufactureDate) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'WorkSheet',
      entityId: id,
      newValues: JSON.stringify(data),
    },
  });

  return updated;
}

// ============================================================================
// DELETE WORKSHEET (SOFT DELETE)
// ============================================================================

export async function deleteWorksheet(id: string, userId: string) {
  const worksheet = await prisma.workSheet.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!worksheet) throw new Error('Worksheet not found');

  if (['DELIVERED', 'INVOICED'].includes(worksheet.status)) {
    throw new Error('Cannot delete a worksheet that has been invoiced or delivered');
  }

  await prisma.$transaction(async (tx) => {
    await tx.workSheet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'WorkSheet',
        entityId: id,
      },
    });
  });
}

// ============================================================================
// TRANSITION STATUS
// ============================================================================

export async function transitionWorksheetStatus(
  worksheetId: string,
  newStatus: WorksheetStatus,
  userId: string,
  notes?: string
) {
  const worksheet = await prisma.workSheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    select: { id: true, status: true, worksheetNumber: true },
  });

  if (!worksheet) throw new Error('Worksheet not found');

  const currentStatus = worksheet.status as WorksheetStatus;
  const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`
    );
  }

  const updateData: any = { status: newStatus };
  if (newStatus === 'DELIVERED') updateData.completedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workSheet.update({
      where: { id: worksheetId },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        oldValues: JSON.stringify({ status: currentStatus }),
        newValues: JSON.stringify({ status: newStatus }),
        reason: notes,
      },
    });

    return updated;
  });
}

// ============================================================================
// ASSIGN TEETH
// ============================================================================

export async function assignTeeth(
  worksheetId: string,
  data: {
    teeth: Array<{
      toothNumber: string;
      workType: string;
      shade?: string;
      notes?: string;
    }>;
  },
  userId: string
) {
  const { teeth } = data;
  return prisma.$transaction(async (tx) => {
    // Delete existing teeth
    await tx.worksheetTooth.deleteMany({ where: { worksheetId } });

    // Create new teeth
    if (teeth.length > 0) {
      await tx.worksheetTooth.createMany({
        data: teeth.map((t) => ({
          worksheetId,
          toothNumber: t.toothNumber,
          workType: t.workType,
          shade: t.shade ?? null,
          notes: t.notes ?? null,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({ teethCount: teeth.length }),
        reason: 'Teeth updated',
      },
    });

    return prisma.worksheetTooth.findMany({ where: { worksheetId } });
  });
}

// ============================================================================
// ASSIGN PRODUCTS
// ============================================================================

export async function assignProducts(
  worksheetId: string,
  data: {
    products: Array<{
      productId: string;
      quantity: number;
      priceAtSelection: number;
      notes?: string;
      materials?: Array<{
        materialId: string;
        materialLotId?: string;
        quantityUsed: number;
        toothNumber?: string;
        notes?: string;
        position?: number;
      }>;
    }>;
  },
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    // Delete existing product assignments (cascade deletes WorksheetProductMaterial)
    await tx.worksheetProduct.deleteMany({ where: { worksheetId } });

    // Create new product assignments
    for (const product of data.products) {
      const wp = await tx.worksheetProduct.create({
        data: {
          worksheetId,
          productId: product.productId,
          quantity: product.quantity,
          priceAtSelection: product.priceAtSelection,
          notes: product.notes ?? null,
        },
      });

      // Create material associations via WorksheetProductMaterial
      if (product.materials && product.materials.length > 0) {
        await tx.worksheetProductMaterial.createMany({
          data: product.materials.map((m) => ({
            worksheetProductId: wp.id,
            materialId: m.materialId,
            materialLotId: m.materialLotId ?? null,
            quantityUsed: m.quantityUsed,
            toothNumber: m.toothNumber ?? null,
            notes: m.notes ?? null,
            position: m.position ?? null,
          })),
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({ productsCount: data.products.length }),
        reason: 'Products updated',
      },
    });
  });
}

// ============================================================================
// ASSIGN MATERIALS (direct worksheet-level tracking)
// ============================================================================

export async function assignMaterials(
  worksheetId: string,
  data: {
    materials: Array<{
      materialId: string;
      materialLotId?: string;
      quantityUsed: number;
      notes?: string;
    }>;
  },
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    // Delete existing material assignments
    await tx.worksheetMaterial.deleteMany({ where: { worksheetId } });

    if (data.materials.length > 0) {
      await tx.worksheetMaterial.createMany({
        data: data.materials.map((m) => ({
          worksheetId,
          materialId: m.materialId,
          materialLotId: m.materialLotId ?? null,
          quantityPlanned: m.quantityUsed,
          notes: m.notes ?? null,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({ materialsCount: data.materials.length }),
        reason: 'Materials updated',
      },
    });
  });
}
