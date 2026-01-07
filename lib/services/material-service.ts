// Material Inventory Management Service
// EU MDR Annex XIII Compliance - FIFO LOT Tracking & Traceability

import { prisma } from '@/lib/prisma';
import { MaterialLotStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  CreateLotDto,
  UpdateLotDto,
  MaterialFilters,
  MaterialLotFilters,
  AvailableMaterial,
  FIFOSelection,
  ExpiryAlert,
  LowStockAlert,
  TraceabilityData,
  WorksheetMaterialsData,
  MaterialStatistics,
  InventoryOverview,
  ConsumeMaterialDto,
  ConsumptionResult,
  InsufficientStockError,
  ExpiredMaterialError,
  DuplicateLotError,
  MaterialWithLots,
  MaterialLotWithMaterial,
  MaterialLotWithUsage,
} from '@/types/material';

// ============================================================================
// MATERIAL CRUD OPERATIONS
// ============================================================================

/**
 * Get materials with optional filtering
 */
export async function getMaterials(
  filters: MaterialFilters = {},
  page: number = 1,
  pageSize: number = 20
) {
  const { type, active, search, hasStock, biocompatible, ceMarked } = filters;

  // Build where clause
  const where: Prisma.MaterialWhereInput = {
    deletedAt: null,
    ...(type && { type }),
    ...(active !== undefined && { active }),
    ...(biocompatible !== undefined && { biocompatible }),
    ...(ceMarked !== undefined && { ceMarked }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Count total
  const total = await prisma.material.count({ where });

  // Fetch materials with lots
  let materials = await prisma.material.findMany({
    where,
    include: {
      lots: {
        where: {
          status: 'AVAILABLE',
          quantityAvailable: { gt: 0 },
        },
        orderBy: { arrivalDate: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Filter by hasStock if specified
  if (hasStock) {
    materials = materials.filter((m) => m.lots.length > 0);
  }

  return {
    data: materials as MaterialWithLots[],
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get material by ID with all LOTs
 */
export async function getMaterialById(id: string): Promise<MaterialWithLots | null> {
  return prisma.material.findUnique({
    where: { id, deletedAt: null },
    include: {
      lots: {
        orderBy: { arrivalDate: 'asc' },
      },
    },
  }) as Promise<MaterialWithLots | null>;
}

/**
 * Create new material
 */
export async function createMaterial(
  data: CreateMaterialDto,
  userId: string
): Promise<MaterialWithLots> {
  // Check for duplicate code
  const existing = await prisma.material.findUnique({
    where: { code: data.code },
  });

  if (existing && !existing.deletedAt) {
    throw new Error(`Material with code ${data.code} already exists`);
  }

  // Create material
  const material = await prisma.material.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      manufacturer: data.manufacturer,
      description: data.description,
      biocompatible: data.biocompatible ?? true,
      iso10993Cert: data.iso10993Cert,
      ceMarked: data.ceMarked ?? true,
      ceNumber: data.ceNumber,
      unit: data.unit ?? 'gram',
      active: data.active ?? true,
    },
    include: {
      lots: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE',
      entityType: 'Material',
      entityId: material.id,
      newValues: JSON.stringify(material),
      reason: 'Material created',
    },
  });

  return material as MaterialWithLots;
}

/**
 * Update material
 */
export async function updateMaterial(
  id: string,
  data: UpdateMaterialDto,
  userId: string
): Promise<MaterialWithLots> {
  // Get existing material
  const existing = await prisma.material.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Material not found');
  }

  // Check for duplicate code if changing
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.material.findUnique({
      where: { code: data.code },
    });

    if (duplicate && !duplicate.deletedAt && duplicate.id !== id) {
      throw new Error(`Material with code ${data.code} already exists`);
    }
  }

  // Update material
  const updated = await prisma.material.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code }),
      ...(data.name && { name: data.name }),
      ...(data.type && { type: data.type }),
      ...(data.manufacturer && { manufacturer: data.manufacturer }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.biocompatible !== undefined && { biocompatible: data.biocompatible }),
      ...(data.iso10993Cert !== undefined && { iso10993Cert: data.iso10993Cert }),
      ...(data.ceMarked !== undefined && { ceMarked: data.ceMarked }),
      ...(data.ceNumber !== undefined && { ceNumber: data.ceNumber }),
      ...(data.unit && { unit: data.unit }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: {
      lots: {
        orderBy: { arrivalDate: 'asc' },
      },
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'Material',
      entityId: id,
      oldValues: JSON.stringify(existing),
      newValues: JSON.stringify(updated),
      reason: 'Material updated',
    },
  });

  return updated as MaterialWithLots;
}

/**
 * Delete material (Option A: Smart delete with validation)
 * - Prevents deletion if any LOTs have been used in worksheets (MDR compliance)
 * - Allows deletion only for materials with no LOTs, or only unused LOTs
 */
export async function deleteMaterial(id: string, userId: string): Promise<void> {
  // Get existing material
  const existing = await prisma.material.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Material not found');
  }

  // Check if material has been used in any worksheets (MDR traceability check)
  const usageCount = await prisma.worksheetMaterial.count({
    where: { materialId: id },
  });

  if (usageCount > 0) {
    throw new Error(
      `Cannot delete material: Used in ${usageCount} worksheet(s). ` +
      `This would violate EU MDR traceability requirements. ` +
      `Please mark as inactive instead.`
    );
  }

  // Check if any LOTs have been used
  const lotsWithUsage = await prisma.materialLot.findMany({
    where: {
      materialId: id,
      worksheetMaterials: {
        some: {},
      },
    },
    select: { id: true, lotNumber: true },
  });

  if (lotsWithUsage.length > 0) {
    const lotNumbers = lotsWithUsage.map(l => l.lotNumber).join(', ');
    throw new Error(
      `Cannot delete material: LOT(s) ${lotNumbers} have been used in worksheets. ` +
      `This would violate EU MDR traceability requirements. ` +
      `Please mark as inactive instead.`
    );
  }

  // Use transaction to delete material and all unused LOTs
  await prisma.$transaction(async (tx) => {
    // Delete all unused LOTs first
    await tx.materialLot.deleteMany({
      where: { materialId: id },
    });

    // Delete material (hard delete since never used)
    await tx.material.delete({
      where: { id },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'Material',
        entityId: id,
        oldValues: JSON.stringify(existing),
        reason: 'Material deleted (never used - safe for removal)',
      },
    });
  });
}

/**
 * Delete material LOT (Option A: Smart delete with validation)
 * - Prevents deletion if LOT has been used in any worksheet (MDR compliance)
 * - Allows deletion only for unused LOTs (mistake correction)
 */
export async function deleteMaterialLot(lotId: string, userId: string): Promise<void> {
  // Get existing LOT
  const existing = await prisma.materialLot.findUnique({
    where: { id: lotId },
    include: { material: true },
  });

  if (!existing) {
    throw new Error('Material LOT not found');
  }

  // Check if LOT has been used in any worksheets (MDR traceability check)
  const usageCount = await prisma.worksheetMaterial.count({
    where: { materialLotId: lotId },
  });

  if (usageCount > 0) {
    throw new Error(
      `Cannot delete LOT ${existing.lotNumber}: Used in ${usageCount} worksheet(s). ` +
      `This would violate EU MDR traceability requirements. ` +
      `Please mark as RECALLED status instead.`
    );
  }

  // Hard delete since LOT was never used
  await prisma.materialLot.delete({
    where: { id: lotId },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'DELETE',
      entityType: 'MaterialLot',
      entityId: lotId,
      oldValues: JSON.stringify(existing),
      reason: `LOT ${existing.lotNumber} deleted (never used - safe for removal)`,
    },
  });
}

// ============================================================================
// LOT MANAGEMENT
// ============================================================================

/**
 * Record stock arrival (create MaterialLot)
 */
export async function recordStockArrival(
  data: CreateLotDto,
  userId: string
): Promise<MaterialLotWithMaterial> {
  // Verify material exists
  const material = await prisma.material.findUnique({
    where: { id: data.materialId, deletedAt: null },
  });

  if (!material) {
    throw new Error('Material not found');
  }

  // Check for duplicate LOT number
  const existing = await prisma.materialLot.findFirst({
    where: {
      materialId: data.materialId,
      lotNumber: data.lotNumber,
    },
  });

  if (existing) {
    throw new DuplicateLotError(data.materialId, data.lotNumber);
  }

  // Convert quantity to Decimal
  const quantity = new Decimal(data.quantityReceived.toString());

  // Create LOT
  const lot = await prisma.materialLot.create({
    data: {
      materialId: data.materialId,
      lotNumber: data.lotNumber,
      arrivalDate: data.arrivalDate ?? new Date(),
      expiryDate: data.expiryDate,
      supplierName: data.supplierName,
      quantityReceived: quantity,
      quantityAvailable: quantity,
      status: 'AVAILABLE',
      notes: data.notes,
    },
    include: {
      material: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE',
      entityType: 'MaterialLot',
      entityId: lot.id,
      newValues: JSON.stringify(lot),
      reason: `Stock arrival: ${data.lotNumber}`,
    },
  });

  return lot as MaterialLotWithMaterial;
}

/**
 * Get material LOTs with filtering
 */
export async function getMaterialLots(
  filters: MaterialLotFilters = {},
  page: number = 1,
  pageSize: number = 50
) {
  const { materialId, status, expiringWithinDays, includeExpired } = filters;

  // Build where clause
  const where: Prisma.MaterialLotWhereInput = {
    ...(materialId && { materialId }),
    ...(status && { status }),
  };

  // Expiry filtering
  if (expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + expiringWithinDays);

    where.expiryDate = {
      lte: futureDate,
      ...(includeExpired ? {} : { gte: new Date() }),
    };
  }

  // Count total
  const total = await prisma.materialLot.count({ where });

  // Fetch LOTs
  const lots = await prisma.materialLot.findMany({
    where,
    include: {
      material: true,
    },
    orderBy: { arrivalDate: 'asc' }, // FIFO order
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    data: lots as MaterialLotWithMaterial[],
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Update LOT status or quantity
 */
export async function updateLotStatus(
  lotId: string,
  data: UpdateLotDto,
  userId: string
): Promise<MaterialLotWithMaterial> {
  // Get existing LOT
  const existing = await prisma.materialLot.findUnique({
    where: { id: lotId },
  });

  if (!existing) {
    throw new Error('Material LOT not found');
  }

  // Update LOT
  const updated = await prisma.materialLot.update({
    where: { id: lotId },
    data: {
      ...(data.lotNumber && { lotNumber: data.lotNumber }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
      ...(data.supplierName && { supplierName: data.supplierName }),
      ...(data.quantityAvailable !== undefined && {
        quantityAvailable: new Decimal(data.quantityAvailable.toString()),
      }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      material: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entityType: 'MaterialLot',
      entityId: lotId,
      oldValues: JSON.stringify(existing),
      newValues: JSON.stringify(updated),
      reason: `LOT status/quantity updated`,
    },
  });

  return updated as MaterialLotWithMaterial;
}

// ============================================================================
// FIFO SELECTION & CONSUMPTION (CRITICAL FOR MDR COMPLIANCE)
// ============================================================================

/**
 * Get available materials (with stock) for worksheet selection
 */
export async function getAvailableMaterials(): Promise<AvailableMaterial[]> {
  const materials = await prisma.material.findMany({
    where: {
      deletedAt: null,
      active: true,
      lots: {
        some: {
          status: 'AVAILABLE',
          quantityAvailable: { gt: 0 },
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } },
          ],
        },
      },
    },
    include: {
      lots: {
        where: {
          status: 'AVAILABLE',
          quantityAvailable: { gt: 0 },
          OR: [
            { expiryDate: null },
            { expiryDate: { gt: new Date() } },
          ],
        },
        orderBy: { arrivalDate: 'asc' }, // FIFO
        take: 1, // Oldest LOT only
      },
    },
    orderBy: { code: 'asc' },
  });

  return materials.map((material) => {
    // Calculate total available quantity across all lots
    const totalQuantity = material.lots.reduce(
      (sum, lot) => sum.add(lot.quantityAvailable),
      new Decimal(0)
    );

    return {
      id: material.id,
      code: material.code,
      name: material.name,
      type: material.type,
      manufacturer: material.manufacturer,
      unit: material.unit,
      totalAvailableQuantity: totalQuantity,
      oldestLot: material.lots[0]
        ? {
            id: material.lots[0].id,
            lotNumber: material.lots[0].lotNumber,
            arrivalDate: material.lots[0].arrivalDate,
            expiryDate: material.lots[0].expiryDate,
            quantityAvailable: material.lots[0].quantityAvailable,
          }
        : null,
      lotCount: material.lots.length,
    };
  });
}

/**
 * Select material LOT for worksheet using FIFO algorithm
 * CRITICAL: Always use oldest available LOT first
 */
export async function selectMaterialForWorksheet(
  materialId: string,
  quantityNeeded: number | Decimal
): Promise<FIFOSelection> {
  const quantity = new Decimal(quantityNeeded.toString());

  // Find oldest available LOT (FIFO)
  const oldestLot = await prisma.materialLot.findFirst({
    where: {
      materialId,
      status: 'AVAILABLE',
      quantityAvailable: { gt: 0 },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: new Date() } },
      ],
    },
    orderBy: { arrivalDate: 'asc' }, // FIFO: oldest first
  });

  if (!oldestLot) {
    throw new InsufficientStockError(
      materialId,
      'Material',
      quantity,
      new Decimal(0)
    );
  }

  // Check if oldest LOT has enough quantity
  if (oldestLot.quantityAvailable.lt(quantity)) {
    // TODO: In future, implement multi-LOT consumption
    throw new InsufficientStockError(
      materialId,
      'Material',
      quantity,
      oldestLot.quantityAvailable
    );
  }

  return {
    materialLotId: oldestLot.id,
    lotNumber: oldestLot.lotNumber,
    arrivalDate: oldestLot.arrivalDate,
    expiryDate: oldestLot.expiryDate,
    quantityAvailable: oldestLot.quantityAvailable,
    quantityToUse: quantity,
  };
}

/**
 * Consume material (deduct quantity, create WorksheetMaterial link)
 * CRITICAL: This is the traceability entry point
 */
export async function consumeMaterial(
  data: ConsumeMaterialDto,
  userId: string
): Promise<ConsumptionResult> {
  const { worksheetId, materialId, quantityNeeded, notes } = data;
  const quantity = new Decimal(quantityNeeded.toString());

  // Verify worksheet exists
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  // Select LOT using FIFO
  const selection = await selectMaterialForWorksheet(materialId, quantity);

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Deduct quantity from LOT
    const newQuantity = selection.quantityAvailable.sub(quantity);

    const updatedLot = await tx.materialLot.update({
      where: { id: selection.materialLotId },
      data: {
        quantityAvailable: newQuantity,
        // Auto-update status to DEPLETED if quantity reaches zero
        ...(newQuantity.lte(0) && { status: 'DEPLETED' as MaterialLotStatus }),
      },
    });

    // Create WorksheetMaterial record (traceability link)
    const worksheetMaterial = await tx.worksheetMaterial.create({
      data: {
        worksheetId,
        materialId,
        materialLotId: selection.materialLotId,
        quantityPlanned: quantity,
        notes,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'MATERIAL_ASSIGN',
        entityType: 'WorksheetMaterial',
        entityId: worksheetMaterial.id,
        newValues: JSON.stringify({
          worksheetId,
          materialId,
          materialLotId: selection.materialLotId,
          lotNumber: selection.lotNumber,
          quantityUsed: quantity.toString(),
          quantityRemaining: newQuantity.toString(),
        }),
        reason: `Material consumed from LOT ${selection.lotNumber}`,
      },
    });

    return {
      worksheetMaterial,
      updatedLot,
    };
  });

  return {
    success: true,
    worksheetMaterialId: result.worksheetMaterial.id,
    lotUsed: {
      materialLotId: selection.materialLotId,
      lotNumber: selection.lotNumber,
      quantityUsed: quantity,
      quantityRemaining: result.updatedLot.quantityAvailable,
    },
    warnings:
      result.updatedLot.status === 'DEPLETED'
        ? [`LOT ${selection.lotNumber} is now depleted`]
        : [],
  };
}

// ============================================================================
// ALERTS & MONITORING
// ============================================================================

/**
 * Get materials expiring within specified days
 */
export async function getExpiringMaterials(
  daysThreshold: number = 30
): Promise<ExpiryAlert[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);

  const lots = await prisma.materialLot.findMany({
    where: {
      status: 'AVAILABLE',
      quantityAvailable: { gt: 0 },
      expiryDate: {
        lte: futureDate,
        gte: new Date(),
      },
    },
    include: {
      material: true,
    },
    orderBy: { expiryDate: 'asc' },
  });

  return lots.map((lot) => {
    const now = new Date();
    const expiry = lot.expiryDate!;
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let severity: 'critical' | 'warning' | 'info';
    if (daysUntilExpiry < 7) {
      severity = 'critical';
    } else if (daysUntilExpiry < 30) {
      severity = 'warning';
    } else {
      severity = 'info';
    }

    return {
      materialLotId: lot.id,
      materialId: lot.materialId,
      materialCode: lot.material.code,
      materialName: lot.material.name,
      lotNumber: lot.lotNumber,
      expiryDate: expiry,
      daysUntilExpiry,
      quantityAvailable: lot.quantityAvailable,
      severity,
    };
  });
}

/**
 * Get materials with low stock (below threshold)
 */
export async function getLowStockMaterials(
  threshold: number = 20
): Promise<LowStockAlert[]> {
  const materials = await prisma.material.findMany({
    where: {
      deletedAt: null,
      active: true,
    },
    include: {
      lots: {
        where: {
          status: 'AVAILABLE',
          quantityAvailable: { gt: 0 },
        },
      },
    },
  });

  const lowStockMaterials: LowStockAlert[] = [];

  for (const material of materials) {
    const totalQuantity = material.lots.reduce(
      (sum, lot) => sum.add(lot.quantityAvailable),
      new Decimal(0)
    );

    const thresholdDecimal = new Decimal(threshold);

    if (totalQuantity.lt(thresholdDecimal)) {
      lowStockMaterials.push({
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        type: material.type,
        unit: material.unit,
        totalAvailableQuantity: totalQuantity,
        threshold: thresholdDecimal,
        percentageOfThreshold: totalQuantity
          .div(thresholdDecimal)
          .mul(100)
          .toNumber(),
      });
    }
  }

  return lowStockMaterials.sort((a, b) => a.percentageOfThreshold - b.percentageOfThreshold);
}

/**
 * Get expired LOTs (need status update)
 */
export async function getExpiredLots() {
  return prisma.materialLot.findMany({
    where: {
      status: 'AVAILABLE',
      expiryDate: {
        lt: new Date(),
      },
    },
    include: {
      material: true,
    },
    orderBy: { expiryDate: 'asc' },
  });
}

/**
 * Get depleted LOTs for archival
 */
export async function getDepletedLots() {
  return prisma.materialLot.findMany({
    where: {
      status: 'DEPLETED',
      quantityAvailable: { lte: 0 },
    },
    include: {
      material: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

// ============================================================================
// TRACEABILITY (EU MDR COMPLIANCE)
// ============================================================================

/**
 * Forward traceability: Given LOT number, find all devices using it
 */
export async function getLotTraceability(
  lotNumber: string
): Promise<TraceabilityData | null> {
  const lot = await prisma.materialLot.findFirst({
    where: { lotNumber },
    include: {
      material: true,
      worksheetMaterials: {
        include: {
          worksheet: {
            include: {
              dentist: true,
            },
          },
        },
      },
    },
  });

  if (!lot) {
    return null;
  }

  const forwardTrace = lot.worksheetMaterials.map((wm) => ({
    worksheetId: wm.worksheet.id,
    worksheetNumber: wm.worksheet.worksheetNumber,
    manufactureDate: wm.worksheet.manufactureDate,
    quantityUsed: wm.quantityPlanned,
    dentist: {
      clinicName: wm.worksheet.dentist.clinicName,
      dentistName: wm.worksheet.dentist.dentistName,
    },
    patientName: wm.worksheet.patientName,
  }));

  const totalQuantityUsed = lot.worksheetMaterials.reduce(
    (sum, wm) => sum.add(wm.quantityPlanned),
    new Decimal(0)
  );

  const uniquePatients = new Set(
    lot.worksheetMaterials
      .filter((wm) => wm.worksheet.patientName)
      .map((wm) => wm.worksheet.patientName)
  );

  const dates = lot.worksheetMaterials
    .map((wm) => wm.createdAt)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    lot: lot as MaterialLotWithUsage,
    forwardTrace,
    summary: {
      totalQuantityUsed,
      worksheetsCount: lot.worksheetMaterials.length,
      patientsAffected: uniquePatients.size,
      dateRange: {
        firstUse: dates[0] || null,
        lastUse: dates[dates.length - 1] || null,
      },
    },
  };
}

/**
 * Reverse traceability: Given worksheet, find all materials/LOTs used
 */
export async function getWorksheetMaterials(
  worksheetId: string
): Promise<WorksheetMaterialsData | null> {
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    include: {
      materials: {
        include: {
          material: true,
          materialLot: true,
        },
      },
    },
  });

  if (!worksheet) {
    return null;
  }

  return {
    worksheetId: worksheet.id,
    worksheetNumber: worksheet.worksheetNumber,
    materials: worksheet.materials.map((wm) => ({
      materialId: wm.material.id,
      materialCode: wm.material.code,
      materialName: wm.material.name,
      materialType: wm.material.type,
      manufacturer: wm.material.manufacturer,
      lotNumber: wm.materialLot?.lotNumber ?? null,
      lotArrivalDate: wm.materialLot?.arrivalDate ?? null,
      lotExpiryDate: wm.materialLot?.expiryDate ?? null,
      quantityUsed: wm.quantityPlanned,
      biocompatible: wm.material.biocompatible,
      ceMarked: wm.material.ceMarked,
      ceNumber: wm.material.ceNumber,
    })),
  };
}

// ============================================================================
// INVENTORY OVERVIEW & STATISTICS
// ============================================================================

/**
 * Get complete inventory overview
 */
export async function getInventoryOverview(): Promise<InventoryOverview> {
  const materials = await prisma.material.findMany({
    where: { deletedAt: null },
    include: {
      lots: true,
    },
  });

  const now = new Date();
  const future30Days = new Date();
  future30Days.setDate(future30Days.getDate() + 30);

  const overview = materials.map((material) => {
    const totalLots = material.lots.length;
    const availableLots = material.lots.filter(
      (lot) => lot.status === 'AVAILABLE' && lot.quantityAvailable.gt(0)
    ).length;

    const totalQuantity = material.lots.reduce(
      (sum, lot) => sum.add(lot.quantityReceived),
      new Decimal(0)
    );

    const availableQuantity = material.lots
      .filter((lot) => lot.status === 'AVAILABLE')
      .reduce((sum, lot) => sum.add(lot.quantityAvailable), new Decimal(0));

    const expiringLots = material.lots.filter(
      (lot) =>
        lot.status === 'AVAILABLE' &&
        lot.expiryDate &&
        lot.expiryDate >= now &&
        lot.expiryDate <= future30Days
    ).length;

    const oldestExpiry = material.lots
      .filter((lot) => lot.status === 'AVAILABLE' && lot.expiryDate)
      .map((lot) => lot.expiryDate!)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return {
      id: material.id,
      code: material.code,
      name: material.name,
      type: material.type,
      manufacturer: material.manufacturer,
      unit: material.unit,
      totalLots,
      availableLots,
      totalQuantity,
      availableQuantity,
      expiringLots,
      oldestExpiryDate: oldestExpiry || null,
    };
  });

  const activeMaterials = materials.filter((m) => m.active).length;
  const totalLotsCount = materials.reduce((sum, m) => sum + m.lots.length, 0);
  const availableLotsCount = overview.reduce((sum, m) => sum + m.availableLots, 0);
  const expiringCount = overview.reduce((sum, m) => sum + m.expiringLots, 0);

  // Count low stock (< 20 units)
  const lowStockCount = overview.filter((m) => m.availableQuantity.lt(20)).length;

  return {
    materials: overview,
    summary: {
      totalMaterials: materials.length,
      activeMaterials,
      totalLots: totalLotsCount,
      availableLots: availableLotsCount,
      expiringWithin30Days: expiringCount,
      lowStockMaterials: lowStockCount,
    },
  };
}
