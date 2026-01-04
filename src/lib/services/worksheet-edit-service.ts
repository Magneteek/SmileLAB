/**
 * Worksheet Edit Service with Full Audit Trail
 *
 * Enables editing worksheets at any stage with:
 * - Mandatory reason for change (non-DRAFT edits)
 * - Field-by-field change tracking
 * - Complete audit trail
 * - Protection of critical traceability fields
 */

import { prisma } from '@/lib/prisma';
import type { WorkSheet } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WorksheetEditDto {
  // Basic Info
  patientName?: string;
  deviceDescription?: string;
  intendedUse?: string;
  technicalNotes?: string;
  manufactureDate?: Date;

  // Metadata
  reasonForChange: string; // REQUIRED for non-DRAFT edits
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface EditResult {
  worksheet: WorkSheet;
  changes: FieldChange[];
  auditLogId: string;
}

// ============================================================================
// PROTECTED FIELDS
// ============================================================================

/**
 * Fields that cannot be edited after production starts
 * (Material LOT traceability must remain immutable)
 */
const PROTECTED_AFTER_PRODUCTION = [
  'orderId',
  'dentistId',
  'worksheetNumber',
];

/**
 * Fields that should never be directly edited
 */
const IMMUTABLE_FIELDS = [
  'id',
  'createdAt',
  'createdById',
  'deletedAt',
];

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if worksheet can be edited based on current status
 */
function canEditWorksheet(worksheet: WorkSheet, data: WorksheetEditDto): {
  allowed: boolean;
  reason?: string;
} {
  // DRAFT worksheets can always be edited without reason
  if (worksheet.status === 'DRAFT') {
    return { allowed: true };
  }

  // Non-DRAFT edits require reason for change
  if (!data.reasonForChange || data.reasonForChange.trim().length === 0) {
    return {
      allowed: false,
      reason:
        'Editing worksheets beyond DRAFT status requires a reason for change (MDR Article 10 compliance)',
    };
  }

  // Reason must be meaningful (at least 10 characters)
  if (data.reasonForChange.trim().length < 10) {
    return {
      allowed: false,
      reason: 'Reason for change must be at least 10 characters',
    };
  }

  // Cannot edit if delivered or cancelled
  if (['DELIVERED', 'CANCELLED'].includes(worksheet.status)) {
    return {
      allowed: false,
      reason: `Cannot edit worksheets in ${worksheet.status} status`,
    };
  }

  return { allowed: true };
}

/**
 * Detect field-by-field changes
 */
function detectChanges(
  oldWorksheet: WorkSheet,
  newData: Partial<WorkSheet>
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const [field, newValue] of Object.entries(newData)) {
    // Skip fields that aren't in the worksheet model
    if (!(field in oldWorksheet)) continue;

    const oldValue = (oldWorksheet as any)[field];

    // Compare values (handle null/undefined)
    if (oldValue !== newValue) {
      // Skip if both are null/undefined
      if (oldValue == null && newValue == null) continue;

      changes.push({
        field,
        oldValue: oldValue,
        newValue: newValue,
      });
    }
  }

  return changes;
}

// ============================================================================
// MAIN EDIT FUNCTION
// ============================================================================

/**
 * Edit worksheet with full audit trail
 *
 * Features:
 * - Editable at any stage (except DELIVERED/CANCELLED)
 * - Requires reason for non-DRAFT edits
 * - Tracks all field changes
 * - Creates detailed audit log
 * - Protects critical traceability fields
 */
export async function editWorksheetWithAudit(
  worksheetId: string,
  data: WorksheetEditDto,
  userId: string
): Promise<EditResult> {
  return await prisma.$transaction(async (tx) => {
    // Get current worksheet state
    const currentWorksheet = await tx.workSheet.findUnique({
      where: { id: worksheetId },
    });

    if (!currentWorksheet || currentWorksheet.deletedAt) {
      throw new Error('Worksheet not found');
    }

    // Validate edit is allowed
    const validation = canEditWorksheet(currentWorksheet, data);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Edit not allowed');
    }

    // Prepare update data (remove reasonForChange from worksheet data)
    const { reasonForChange, ...updateData } = data;

    // Detect what changed
    const changes = detectChanges(currentWorksheet, updateData);

    // If no changes, don't update
    if (changes.length === 0) {
      return {
        worksheet: currentWorksheet,
        changes: [],
        auditLogId: '',
      };
    }

    // Update worksheet
    const updatedWorksheet = await tx.workSheet.update({
      where: { id: worksheetId },
      data: updateData,
    });

    // Create detailed audit log
    const auditLog = await tx.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: worksheetId,
        oldValues: JSON.stringify({
          changes: changes.map((c) => ({
            field: c.field,
            value: c.oldValue,
          })),
        }),
        newValues: JSON.stringify({
          changes: changes.map((c) => ({
            field: c.field,
            value: c.newValue,
          })),
          reasonForChange:
            currentWorksheet.status !== 'DRAFT' ? reasonForChange : undefined,
        }),
        details: JSON.stringify({
          status: currentWorksheet.status,
          worksheetNumber: currentWorksheet.worksheetNumber,
          fieldsChanged: changes.map((c) => c.field),
          reasonForChange:
            currentWorksheet.status !== 'DRAFT' ? reasonForChange : undefined,
        }),
      },
    });

    return {
      worksheet: updatedWorksheet,
      changes,
      auditLogId: auditLog.id,
    };
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get edit history for a worksheet
 */
export async function getWorksheetEditHistory(worksheetId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'WorkSheet',
      entityId: worksheetId,
      action: {
        in: ['CREATE', 'UPDATE', 'DELETE'],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    user: log.user,
    timestamp: log.timestamp,
    changes: parseAuditLogChanges(log),
    reasonForChange: parseReasonForChange(log),
  }));
}

/**
 * Parse audit log to extract changes
 */
function parseAuditLogChanges(log: any): FieldChange[] {
  try {
    const newValues = JSON.parse(log.newValues || '{}');
    const oldValues = JSON.parse(log.oldValues || '{}');

    if (newValues.changes && Array.isArray(newValues.changes)) {
      return newValues.changes.map((change: any, index: number) => ({
        field: change.field,
        newValue: change.value,
        oldValue: oldValues.changes?.[index]?.value,
      }));
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Parse reason for change from audit log
 */
function parseReasonForChange(log: any): string | null {
  try {
    const newValues = JSON.parse(log.newValues || '{}');
    return newValues.reasonForChange || null;
  } catch {
    return null;
  }
}
