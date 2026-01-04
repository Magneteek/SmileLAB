/**
 * Worksheet Management Service
 * Core business logic for worksheet lifecycle management
 *
 * Features:
 * - Worksheet creation from orders
 * - FDI teeth assignment
 * - Product assignment with price versioning
 * - Material assignment with FIFO LOT selection
 * - State machine transitions
 * - Material traceability
 */

import { prisma } from '@/lib/prisma';
import { Prisma, WorkSheet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  WorksheetStatus,
  CreateWorksheetDto,
  UpdateWorksheetDto,
  TeethSelectionData,
  ProductSelectionData,
  MaterialSelectionData,
  WorksheetTransitionDto,
  WorksheetFilters,
  PaginationParams,
  WorksheetWithRelations,
  WorksheetSummary,
  PaginatedWorksheets,
  MaterialTraceability,
} from '@/types/worksheet';
import {
  canTransition,
  getSideEffectsOnEnter,
} from '@/lib/state-machines/worksheet-state-machine';
import { validateFDI } from '@/lib/utils/fdi-notation';
import { consumeMaterial } from '@/lib/services/material-service';
import type { Role } from '@prisma/client';

// ============================================================================
// WORKSHEET CRUD OPERATIONS
// ============================================================================

/**
 * Create a new worksheet from an order
 * Generates sequential DN-XXX worksheet number
 * Creates worksheet with DRAFT status
 */
export async function createWorksheetFromOrder(
  data: CreateWorksheetDto,
  userId: string
): Promise<WorkSheet> {
  const { orderId, deviceDescription, intendedUse, technicalNotes } = data;

  // Verify order exists and check for existing worksheets
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      worksheets: {
        orderBy: {
          revision: 'desc',
        },
      },
      dentist: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Check if there's an active (not deleted, not voided) worksheet
  // VOIDED worksheets are preserved for MDR compliance and allow creating revisions
  const activeWorksheet = order.worksheets.find(w => !w.deletedAt && w.status !== 'VOIDED');
  if (activeWorksheet) {
    throw new Error(`Order already has an active worksheet (${activeWorksheet.worksheetNumber} Rev ${activeWorksheet.revision}). Void or delete the existing worksheet first to create a revision.`);
  }

  // Generate worksheet number matching order number (DN-25001, DN-25002, etc.)
  const worksheetNumber = `DN-${order.orderNumber}`;

  // Calculate next revision number
  const maxRevision = order.worksheets.length > 0
    ? Math.max(...order.worksheets.map(w => w.revision))
    : 0;
  const nextRevision = maxRevision + 1;

  // Create worksheet in transaction
  const worksheet = await prisma.$transaction(async (tx) => {
    // Create worksheet
    const newWorksheet = await tx.workSheet.create({
      data: {
        worksheetNumber,
        revision: nextRevision,
        orderId,
        dentistId: order.dentistId,
        patientName: order.patientName,
        createdById: userId,
        status: 'DRAFT' as WorksheetStatus,
        deviceDescription,
        intendedUse,
        technicalNotes,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'WorkSheet',
        entityId: newWorksheet.id,
        oldValues: null,
        newValues: JSON.stringify({
          worksheetNumber: newWorksheet.worksheetNumber,
          revision: newWorksheet.revision,
          orderId,
          status: newWorksheet.status,
        }),
      },
    });

    return newWorksheet;
  });

  return worksheet;
}

/**
 * Get worksheet by ID with all relations
 */
export async function getWorksheetById(
  worksheetId: string
): Promise<WorksheetWithRelations | null> {
  try {
    console.log('🔍 getWorksheetById called for ID:', worksheetId);
    const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    include: {
      order: {
        include: {
          dentist: true,
        },
      },
      dentist: true,
      createdBy: true,
      teeth: true,
      products: {
        include: {
          product: true,
          productMaterials: {
            include: {
              material: true,
              materialLot: true,
            },
          },
        },
      },
      materials: {
        include: {
          material: {
            include: {
              lots: {
                where: {
                  status: 'AVAILABLE',
                  OR: [
                    { expiryDate: null },
                    { expiryDate: { gte: new Date() } },
                  ],
                },
                orderBy: {
                  arrivalDate: 'asc', // FIFO ordering
                },
              },
            },
          },
          materialLot: {
            select: {
              id: true,
              lotNumber: true,
              expiryDate: true,
              quantityAvailable: true,
            },
          },
        },
      },
      qualityControls: {
        include: {
          inspector: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          documentNumber: true,
          generatedAt: true,
          retentionUntil: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      invoiceLineItems: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              isDraft: true,
              paymentStatus: true,
            },
          },
        },
      },
    },
  });

    console.log('✅ getWorksheetById found worksheet:', worksheet?.worksheetNumber);
    return worksheet as WorksheetWithRelations | null;
  } catch (error) {
    console.error('❌ getWorksheetById error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get worksheets with filtering and pagination
 */
export async function getWorksheets(
  filters: WorksheetFilters = {},
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<PaginatedWorksheets> {
  const { status, dentistId, patientId, dateFrom, dateTo, search } = filters;
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

  // Build where clause
  const where: Prisma.WorkSheetWhereInput = {
    deletedAt: null,
    ...(status && (Array.isArray(status) ? { status: { in: status } } : { status })),
    ...(dentistId && { dentistId }),
    ...(patientId && { patientId }),
    ...(dateFrom && { createdAt: { gte: dateFrom } }),
    ...(dateTo && { createdAt: { lte: dateTo } }),
    ...(search && {
      OR: [
        { worksheetNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { dentist: { dentistName: { contains: search, mode: 'insensitive' } } },
        { dentist: { clinicName: { contains: search, mode: 'insensitive' } } },
        { patientName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Count total
  const total = await prisma.workSheet.count({ where });

  // Fetch worksheets
  const worksheets = await prisma.workSheet.findMany({
    where,
    include: {
      order: true,
      dentist: true,
      products: {
        include: {
          product: true,
          productMaterials: {
            include: {
              material: true,
              materialLot: true,
            },
          },
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Transform to summary format
  const data: WorksheetSummary[] = worksheets.map((ws) => ({
    id: ws.id,
    worksheetNumber: ws.worksheetNumber,
    status: ws.status as WorksheetStatus,
    orderNumber: ws.order.orderNumber,
    dentistName: ws.dentist.dentistName,
    clinicName: ws.dentist.clinicName,
    patientName: ws.patientName,
    manufactureDate: ws.manufactureDate,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    // Product names (abbreviated list)
    productNames: ws.products.map((p) => p.product.name).join(', '),
    // Materials with LOT numbers
    materialsWithLots: ws.products.flatMap((p) =>
      p.productMaterials.map((pm) => ({
        materialName: pm.material.name,
        lotNumber: pm.materialLot?.lotNumber || null,
      }))
    ),
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update worksheet basic details
 */
export async function updateWorksheet(
  worksheetId: string,
  data: UpdateWorksheetDto,
  userId: string
): Promise<WorkSheet> {
  const worksheet = await prisma.$transaction(async (tx) => {
    const updated = await tx.workSheet.update({
      where: { id: worksheetId },
      data,
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify(data),
      },
    });

    return updated;
  });

  return worksheet;
}

/**
 * Delete worksheet (soft delete, only DRAFT status allowed)
 */
export async function deleteWorksheet(
  worksheetId: string,
  userId: string
): Promise<void> {
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    include: {
      order: true,
    },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  // Can only delete worksheets that haven't been delivered
  if (worksheet.status === 'DELIVERED') {
    throw new Error(`Cannot delete worksheet in ${worksheet.status} status. Worksheets can only be deleted before delivery.`);
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete worksheet
    await tx.workSheet.update({
      where: { id: worksheetId },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED',
      },
    });

    // Reset order back to PENDING so a new worksheet can be created
    await tx.order.update({
      where: { id: worksheet.orderId },
      data: {
        status: 'PENDING',
      },
    });

    // Create audit log for worksheet deletion
    await tx.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        oldValues: JSON.stringify({
          worksheetNumber: worksheet.worksheetNumber,
          status: worksheet.status,
        }),
        newValues: JSON.stringify({
          status: 'CANCELLED',
          deletedAt: new Date(),
        }),
        reason: 'Worksheet deleted - order reset to PENDING',
      },
    });

    // Create audit log for order status reset
    await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: worksheet.orderId,
        oldValues: JSON.stringify({ status: worksheet.order.status }),
        newValues: JSON.stringify({ status: 'PENDING' }),
        reason: `Order reset to PENDING after worksheet ${worksheet.worksheetNumber} was deleted`,
      },
    });
  });
}

// ============================================================================
// TEETH ASSIGNMENT (FDI NOTATION)
// ============================================================================

/**
 * Assign teeth with FDI notation to worksheet
 * Validates FDI numbers and creates WorksheetTooth records
 * DRAFT status only - locked after production starts
 */
export async function assignTeeth(
  worksheetId: string,
  teethData: TeethSelectionData,
  userId: string
): Promise<void> {
  const { teeth } = teethData;

  // Check worksheet status - only DRAFT can be modified
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    select: { status: true },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  if (worksheet.status !== 'DRAFT') {
    throw new Error(
      `Cannot modify teeth assignments for worksheet in ${worksheet.status} status. Only DRAFT worksheets can be edited.`
    );
  }

  // Filter out any teeth with empty/invalid tooth numbers before validation
  const validTeethData = teeth.filter((t) => {
    return t.toothNumber && t.toothNumber.toString().trim() !== '';
  });

  // If no valid teeth after filtering, just delete all and return
  if (validTeethData.length === 0) {
    await prisma.worksheetTooth.deleteMany({
      where: { worksheetId },
    });
    return;
  }

  // Validate all FDI numbers
  const invalidTeeth = validTeethData.filter((t) => {
    const toothNum = typeof t.toothNumber === 'string'
      ? parseInt(t.toothNumber, 10)
      : t.toothNumber;
    return isNaN(toothNum) || !validateFDI(toothNum);
  });

  if (invalidTeeth.length > 0) {
    throw new Error(
      `Invalid FDI numbers: ${invalidTeeth.map((t) => t.toothNumber).join(', ')}`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing teeth (allows re-assignment in DRAFT)
    await tx.worksheetTooth.deleteMany({
      where: { worksheetId },
    });

    // Create new teeth records
    await tx.worksheetTooth.createMany({
      data: validTeethData.map((tooth) => ({
        worksheetId,
        toothNumber: tooth.toothNumber.toString(),
        workType: tooth.workType,
        shade: tooth.shade,
        notes: tooth.notes,
      })),
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({
          teethCount: validTeethData.length,
          teeth: validTeethData.map((t) => t.toothNumber),
        }),
        reason: 'Teeth assignment',
      },
    });
  });
}

// ============================================================================
// PRODUCT ASSIGNMENT (PRICE VERSIONING)
// ============================================================================

/**
 * Assign products to worksheet with price snapshot
 * Captures current prices for historical accuracy
 * DRAFT status only - locked after production starts
 */
export async function assignProducts(
  worksheetId: string,
  productsData: ProductSelectionData,
  userId: string
): Promise<void> {
  const { products } = productsData;

  // Check worksheet status - only DRAFT can be modified
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    select: { status: true },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  if (worksheet.status !== 'DRAFT') {
    throw new Error(
      `Cannot modify product assignments for worksheet in ${worksheet.status} status. Only DRAFT worksheets can be edited.`
    );
  }

  // Verify all products exist
  const productIds = products.map((p) => p.productId);
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (existingProducts.length !== productIds.length) {
    throw new Error('One or more products not found');
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing products (allows re-assignment in DRAFT)
    // This will cascade delete WorksheetProductMaterial records
    await tx.worksheetProduct.deleteMany({
      where: { worksheetId },
    });

    // Create new product records with price snapshot
    // Note: We use create instead of createMany to get back the IDs for junction table
    for (const product of products) {
      const worksheetProduct = await tx.worksheetProduct.create({
        data: {
          worksheetId,
          productId: product.productId,
          quantity: product.quantity,
          priceAtSelection: new Decimal(product.priceAtSelection.toString()),
          notes: product.notes,
        },
      });

      // Create product-material junction records if materials are specified
      // Now supports: multiple instances, LOT selection, tooth association, notes
      if (product.materials && product.materials.length > 0) {
        console.log('🔍 Creating product-material junction records:', {
          worksheetProductId: worksheetProduct.id,
          materialsCount: product.materials.length,
          materials: product.materials.map(m => ({
            materialId: m.materialId,
            lotId: m.materialLotId || 'FIFO',
            tooth: m.toothNumber,
            position: m.position
          }))
        });

        await tx.worksheetProductMaterial.createMany({
          data: product.materials.map((mat, index) => ({
            worksheetProductId: worksheetProduct.id,
            materialId: mat.materialId,
            materialLotId: mat.materialLotId || null,      // Optional LOT
            quantityUsed: new Decimal(mat.quantityUsed.toString()),
            toothNumber: mat.toothNumber || null,           // Optional tooth
            notes: mat.notes || null,                       // Optional notes
            position: mat.position ?? index + 1,            // Auto-increment if not provided
          })),
        });
      }
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({
          productsCount: products.length,
          products: products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            materialsCount: p.materials?.length || 0,
          })),
        }),
        reason: 'Products assignment with materials',
      },
    });
  });
}

// ============================================================================
// MATERIAL ASSIGNMENT (FIFO LOT SELECTION)
// ============================================================================

/**
 * Assign materials to worksheet (DRAFT only - no FIFO consumption yet)
 * Material consumption happens when status transitions to IN_PRODUCTION
 * This allows users to plan materials without immediately deducting stock
 */
export async function assignMaterials(
  worksheetId: string,
  materialsData: MaterialSelectionData,
  userId: string
): Promise<void> {
  const { materials } = materialsData;

  // Check worksheet status - only DRAFT can be modified
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    select: { status: true },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  if (worksheet.status !== 'DRAFT') {
    throw new Error(
      `Cannot modify material assignments for worksheet in ${worksheet.status} status. Only DRAFT worksheets can be edited.`
    );
  }

  // Verify all materials exist
  const materialIds = materials.map((m) => m.materialId);
  const existingMaterials = await prisma.material.findMany({
    where: { id: { in: materialIds } },
  });

  if (existingMaterials.length !== materialIds.length) {
    throw new Error('One or more materials not found');
  }

  // Verify all MaterialLots exist (if LOT assignments are used)
  const materialLotIds = materials
    .map((m) => m.materialLotId)
    .filter((id): id is string => !!id);

  if (materialLotIds.length > 0) {
    const existingLots = await prisma.materialLot.findMany({
      where: { id: { in: materialLotIds } },
    });

    console.log('🔍 Checking MaterialLot IDs:', materialLotIds);
    console.log('✅ Found MaterialLots:', existingLots.map(l => `${l.id} (${l.lotNumber})`));

    if (existingLots.length !== materialLotIds.length) {
      const foundIds = existingLots.map(l => l.id);
      const missingIds = materialLotIds.filter(id => !foundIds.includes(id));
      throw new Error(
        `Invalid LOT assignments. The following MaterialLot IDs don't exist: ${missingIds.join(', ')}`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing material assignments (allows re-assignment in DRAFT)
    await tx.worksheetMaterial.deleteMany({
      where: { worksheetId },
    });

    // Create new material assignment records (WITHOUT consuming stock yet)
    // Stock consumption will happen on DRAFT → IN_PRODUCTION transition
    for (const material of materials) {
      console.log('🔧 Creating WorksheetMaterial with data:', {
        worksheetId,
        materialId: material.materialId,
        materialLotId: material.materialLotId || null,
        quantityPlanned: material.quantityNeeded,
      });

      try {
        await tx.worksheetMaterial.create({
          data: {
            worksheetId,
            materialId: material.materialId,
            materialLotId: material.materialLotId || null, // Specific LOT or null for FIFO (auto)
            quantityPlanned: new Decimal(material.quantityNeeded.toString()),
            notes: material.materialLotId
              ? `Planned material - LOT ${material.materialLotId} selected`
              : `Planned material - FIFO LOT will be assigned during consumption`,
          },
        });
      } catch (createError: any) {
        console.error('❌ Failed to create WorksheetMaterial:', createError);
        console.error('Failed material data:', material);
        throw createError;
      }
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'MATERIAL_ASSIGN',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        newValues: JSON.stringify({
          materialsCount: materials.length,
          materials: materials.map((m) => ({
            materialId: m.materialId,
            quantity: m.quantityNeeded,
          })),
        }),
        reason: 'Material planned - consumption deferred until IN_PRODUCTION',
      },
    });
  });
}

// ============================================================================
// STATE MACHINE TRANSITIONS
// ============================================================================

/**
 * Transition worksheet to new status
 * Validates transition via state machine
 * Triggers side effects (material consumption, Annex XIII generation, etc.)
 */
export async function transitionWorksheetStatus(
  worksheetId: string,
  transition: WorksheetTransitionDto,
  userId: string,
  userRole: Role
): Promise<WorkSheet> {
  const { newStatus, notes } = transition;

  // Get current worksheet
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  const currentStatus = worksheet.status as WorksheetStatus;

  // Validate transition
  const validation = canTransition(currentStatus, newStatus, userRole);

  if (!validation.allowed) {
    throw new Error(
      validation.reason ?? `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }

  // Get side effects for new status
  const sideEffects = getSideEffectsOnEnter(newStatus);

  // Perform transition in transaction
  const updatedWorksheet = await prisma.$transaction(async (tx) => {
    // Update status
    const updated = await tx.workSheet.update({
      where: { id: worksheetId },
      data: {
        status: newStatus,
        ...(notes && { qcNotes: notes }),
        ...(newStatus === 'QC_APPROVED' && !worksheet.manufactureDate && {
          manufactureDate: new Date(),
        }),
        ...(newStatus === 'DELIVERED' && { completedAt: new Date() }),
      },
    });

    // If transitioning to CANCELLED, reset order back to PENDING
    if (newStatus === 'CANCELLED') {
      await tx.order.update({
        where: { id: worksheet.orderId },
        data: { status: 'PENDING' },
      });

      // Create audit log for order reset
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'Order',
          entityId: worksheet.orderId,
          oldValues: JSON.stringify({ status: 'IN_PRODUCTION' }),
          newValues: JSON.stringify({ status: 'PENDING' }),
          reason: `Order reset to PENDING after worksheet was cancelled`,
        },
      });
    }

    // Execute side effects
    await executeSideEffects(sideEffects, worksheetId, userId, tx);

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'STATUS_CHANGE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        oldValues: JSON.stringify({ status: currentStatus }),
        newValues: JSON.stringify({ status: newStatus }),
        reason: notes || `Status changed from ${currentStatus} to ${newStatus}`,
      },
    });

    return updated;
  });

  return updatedWorksheet;
}

/**
 * Execute side effects for state transitions
 */
async function executeSideEffects(
  effects: string[],
  worksheetId: string,
  userId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  for (const effect of effects) {
    switch (effect) {
      case 'setManufactureDate':
        // Already handled in main update
        break;

      case 'consumeMaterials':
        // CRITICAL: Consume materials via FIFO when entering IN_PRODUCTION
        await consumeMaterialsForWorksheet(worksheetId, userId, tx);
        break;

      case 'generateAnnexXIII':
        // Trigger Annex XIII generation (will be handled by external service)
        // Create a task/queue item for PDF generation
        await tx.auditLog.create({
          data: {
            userId,
            action: 'DOCUMENT_GENERATE',
            entityType: 'WorkSheet',
            entityId: worksheetId,
            reason: 'Annex XIII generation requested - triggered by QC_APPROVED',
          },
        });
        break;

      case 'setDeliveryDate':
        // Already handled in main update (completedAt)
        break;

      default:
        console.warn(`Unknown side effect: ${effect}`);
    }
  }
}

/**
 * Consume materials for a worksheet via FIFO
 * Called when transitioning DRAFT → IN_PRODUCTION
 * Updates material assignments with actual LOT numbers from FIFO selection
 */
async function consumeMaterialsForWorksheet(
  worksheetId: string,
  userId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // Get all material assignments for this worksheet
  const materialAssignments = await tx.worksheetMaterial.findMany({
    where: { worksheetId },
    include: { material: true },
  });

  if (materialAssignments.length === 0) {
    return; // No materials to consume
  }

  // Consume each material via FIFO (outside transaction - uses its own)
  // NOTE: This is called from within a transaction, so we need to be careful
  // For now, we'll call the material service which handles its own transaction
  for (const assignment of materialAssignments) {
    try {
      // Call material service to perform FIFO consumption
      // This will create a NEW WorksheetMaterial record with the LOT assigned
      await consumeMaterial(
        {
          worksheetId,
          materialId: assignment.materialId,
          quantityNeeded: assignment.quantityPlanned.toNumber(),
        },
        userId
      );

      // Delete the placeholder assignment (the one with null materialLotId)
      if (!assignment.materialLotId) {
        await tx.worksheetMaterial.delete({
          where: { id: assignment.id },
        });
      }
    } catch (error) {
      // Log error but don't fail entire transition
      console.error(
        `Failed to consume material ${assignment.material.code}:`,
        error
      );
      throw new Error(
        `Cannot start production: Insufficient stock for material ${assignment.material.code}`
      );
    }
  }

  // Audit log for material consumption
  await tx.auditLog.create({
    data: {
      userId,
      action: 'MATERIAL_ASSIGN',
      entityType: 'WorkSheet',
      entityId: worksheetId,
      newValues: JSON.stringify({
        materialsCount: materialAssignments.length,
        materials: materialAssignments.map((m) => ({
          materialId: m.materialId,
          materialCode: m.material.code,
          quantity: m.quantityPlanned.toNumber(),
        })),
      }),
      reason: 'Materials consumed via FIFO - production started',
    },
  });
}

// ============================================================================
// MATERIAL TRACEABILITY
// ============================================================================

/**
 * Get material traceability for a worksheet
 * Reverse traceability: Worksheet → Materials → LOTs
 */
export async function getWorksheetMaterials(
  worksheetId: string
): Promise<MaterialTraceability> {
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
    throw new Error('Worksheet not found');
  }

  const materials = worksheet.materials.map((wm) => ({
    materialId: wm.materialId,
    materialCode: wm.material.code,
    materialName: wm.material.name,
    manufacturer: wm.material.manufacturer,
    lotNumber: wm.materialLot?.lotNumber || 'Not assigned',
    quantityUsed: wm.quantityPlanned.toNumber(),
    expiryDate: wm.materialLot?.expiryDate || null,
    ceMarked: wm.material.ceMarked,
    ceNumber: wm.material.ceNumber,
    biocompatible: wm.material.biocompatible,
    iso10993Cert: wm.material.iso10993Cert,
  }));

  return {
    worksheetNumber: worksheet.worksheetNumber,
    worksheetId: worksheet.id,
    patientName: worksheet.patientName,
    manufactureDate: worksheet.manufactureDate,
    materials,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate sequential worksheet number (DN-001, DN-002, etc.)
 * Uses SystemConfig table for atomic counter
 */
async function generateWorksheetNumber(): Promise<string> {
  // Use transaction to ensure atomic read-increment-write
  const result = await prisma.$transaction(async (tx) => {
    // Get or create the counter
    let config = await tx.systemConfig.findUnique({
      where: { key: 'last_worksheet_number' },
    });

    if (!config) {
      config = await tx.systemConfig.create({
        data: {
          key: 'last_worksheet_number',
          value: '0',
        },
      });
    }

    // Parse current value and increment
    const currentNumber = parseInt(config.value, 10);
    const nextNumber = currentNumber + 1;

    // Update the counter
    await tx.systemConfig.update({
      where: { key: 'last_worksheet_number' },
      data: {
        value: String(nextNumber),
      },
    });

    // Return the next number for this worksheet
    return nextNumber;
  });

  return `DN-${String(result).padStart(3, '0')}`;
}
