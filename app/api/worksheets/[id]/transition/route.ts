/**
 * Worksheet State Transition API Route
 *
 * POST /api/worksheets/:id/transition - Transition worksheet to new status
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
import { transitionWorksheetStatus } from '@/src/lib/services/worksheet-service';
import { WorksheetStatus } from '@/src/types/worksheet';
import { canTransition } from '@/src/lib/state-machines/worksheet-state-machine';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for state transition
 */
const transitionSchema = z.object({
  newStatus: z.enum([
    'DRAFT',
    'IN_PRODUCTION',
    'QC_PENDING',
    'QC_APPROVED',
    'QC_REJECTED',
    'DELIVERED',
    'CANCELLED',
  ] as const),
  notes: z.string().optional(),
});

// ============================================================================
// POST /api/worksheets/:id/transition
// ============================================================================

/**
 * POST /api/worksheets/:id/transition
 * Transition worksheet to a new status
 *
 * Enforces state machine rules:
 * - Validates allowed transitions
 * - Checks user role permissions
 * - Triggers side effects (material consumption, Annex XIII generation, etc.)
 * - Creates audit trail
 *
 * Request body:
 * {
 *   newStatus: "IN_PRODUCTION",  // Target status
 *   notes?: "..."                // Optional notes (required for QC_REJECTED)
 * }
 *
 * State Machine Flow:
 * DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → DELIVERED (auto-set when invoice created)
 *                ↓ (rejection)
 *           QC_REJECTED (can return to IN_PRODUCTION)
 *
 * Side Effects:
 * - DRAFT → IN_PRODUCTION: Material consumption via FIFO
 * - QC_APPROVED: Generate Annex XIII document
 * - DELIVERED: Set when invoice is created/finalized
 *
 * Role Requirements:
 * - DRAFT → IN_PRODUCTION: ADMIN or TECHNICIAN
 * - QC_PENDING → QC_APPROVED/REJECTED: ADMIN, QC_INSPECTOR, or TECHNICIAN
 * - QC_APPROVED → DELIVERED: ADMIN, INVOICING, or TECHNICIAN (via invoice creation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await requireAuth();

    const { id: worksheetId } = await params;

    // Validate request body
    const data = await validateRequestBody(request, transitionSchema);

    // Get current worksheet to check current status
    const { getWorksheetById } = await import('@/src/lib/services/worksheet-service');
    const worksheet = await getWorksheetById(worksheetId);

    if (!worksheet) {
      return handleApiError(new Error('Worksheet not found'));
    }

    const currentStatus = worksheet.status as WorksheetStatus;
    const { newStatus, notes } = data;

    // Validate transition using state machine
    const validation = canTransition(
      currentStatus,
      newStatus,
      session.user.role
    );

    if (!validation.allowed) {
      return forbiddenResponse(
        validation.reason ||
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Special validations
    if (newStatus === 'QC_REJECTED' && !notes) {
      return handleApiError(
        new Error('QC rejection requires notes explaining the reason')
      );
    }

    // Perform transition
    const updatedWorksheet = await transitionWorksheetStatus(
      worksheetId,
      { newStatus, notes },
      session.user.id,
      session.user.role
    );

    // Update order status based on worksheet transition
    const { prisma } = await import('@/lib/prisma');

    // If worksheet is cancelled, return order to PENDING (not CANCELLED)
    // The order should only be CANCELLED if user cancels the order itself
    const orderStatus = newStatus === 'CANCELLED' ? 'PENDING' : newStatus;

    await prisma.order.update({
      where: { id: worksheet.orderId },
      data: { status: orderStatus },
    });

    // Build response message based on transition
    let message = `Worksheet status updated to ${newStatus}`;
    if (newStatus === 'IN_PRODUCTION') {
      message += '. Materials have been consumed via FIFO.';
    } else if (newStatus === 'QC_APPROVED') {
      message += '. Annex XIII document generation requested.';
    } else if (newStatus === 'DELIVERED') {
      message += '. Worksheet completed.';
    }

    return successResponse(
      {
        worksheet: updatedWorksheet,
        transition: {
          from: currentStatus,
          to: newStatus,
          triggeredBy: session.user.name,
        },
      },
      message
    );
  } catch (error) {
    return handleApiError(error);
  }
}
