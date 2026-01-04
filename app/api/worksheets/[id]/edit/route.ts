/**
 * Worksheet Edit API Route with Full Audit Trail
 *
 * POST /api/worksheets/:id/edit - Edit worksheet with change tracking
 * GET /api/worksheets/:id/edit - Get edit history
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
  forbiddenResponse,
} from '@/lib/api/responses';
import {
  editWorksheetWithAudit,
  getWorksheetEditHistory,
  type WorksheetEditDto,
} from '@/src/lib/services/worksheet-edit-service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const editWorksheetSchema = z.object({
  patientName: z.string().optional(),
  deviceDescription: z.string().optional(),
  intendedUse: z.string().optional(),
  technicalNotes: z.string().optional(),
  manufactureDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  reasonForChange: z.string().min(10, 'Reason for change must be at least 10 characters').optional(),
});

// ============================================================================
// POST /api/worksheets/:id/edit
// ============================================================================

/**
 * POST /api/worksheets/:id/edit
 * Edit worksheet with full audit trail
 *
 * Features:
 * - Allows editing at any stage (except DELIVERED/CANCELLED)
 * - Requires reasonForChange for non-DRAFT edits
 * - Tracks all field changes
 * - Creates detailed audit log
 *
 * Request body:
 * {
 *   patientName?: string,
 *   deviceDescription?: string,
 *   intendedUse?: string,
 *   technicalNotes?: string,
 *   manufactureDate?: string,
 *   reasonForChange?: string  // REQUIRED for non-DRAFT edits
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await requireAuth();

    // Only ADMIN and TECHNICIAN can edit worksheets
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return forbiddenResponse(
        'Only Admin and Technician users can edit worksheets'
      );
    }

    const { id: worksheetId } = await params;

    // Validate request body
    const data = await validateRequestBody(request, editWorksheetSchema);

    // Edit worksheet with audit trail
    const result = await editWorksheetWithAudit(
      worksheetId,
      data as WorksheetEditDto,
      session.user.id
    );

    // Build response message
    let message = 'Worksheet updated successfully';
    if (result.changes.length > 0) {
      const fieldNames = result.changes.map((c) => c.field).join(', ');
      message += `. Changed fields: ${fieldNames}`;
    } else {
      message = 'No changes detected';
    }

    return successResponse(
      {
        worksheet: result.worksheet,
        changes: result.changes,
        auditLogId: result.auditLogId,
      },
      message
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/worksheets/:id/edit
// ============================================================================

/**
 * GET /api/worksheets/:id/edit
 * Get complete history for a worksheet (both field edits and state transitions)
 *
 * Returns:
 * - Field edit history (CREATE/UPDATE/DELETE actions)
 * - State transition history (STATUS_CHANGE actions)
 * - Reason for change (for non-DRAFT edits)
 * - User who made the change
 * - Timestamp
 * - Combined and sorted by timestamp descending
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await requireAuth();

    const { id: worksheetId } = await params;

    // Import prisma
    const { prisma } = await import('@/lib/prisma');

    // Get field edit history
    const editHistory = await getWorksheetEditHistory(worksheetId);

    // Get state transition history from AuditLog
    const stateTransitions = await prisma.auditLog.findMany({
      where: {
        entityType: 'WorkSheet',
        entityId: worksheetId,
        action: 'STATUS_CHANGE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Transform state transitions to match history format
    const formattedTransitions = stateTransitions.map((audit) => {
      const oldValues = audit.oldValues ? JSON.parse(audit.oldValues as string) : {};
      const newValues = audit.newValues ? JSON.parse(audit.newValues as string) : {};

      return {
        id: audit.id,
        action: 'STATE_TRANSITION' as const,
        timestamp: audit.timestamp,
        user: {
          id: audit.user.id,
          name: audit.user.name,
          email: audit.user.email,
        },
        fromStatus: oldValues.status || null,
        toStatus: newValues.status || null,
        reason: audit.reason || '',
        changes: [],
      };
    });

    // Combine and sort all history by timestamp descending
    const combinedHistory = [
      ...editHistory,
      ...formattedTransitions,
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return successResponse({
      history: combinedHistory,
      count: combinedHistory.length,
      editCount: editHistory.length,
      transitionCount: formattedTransitions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
