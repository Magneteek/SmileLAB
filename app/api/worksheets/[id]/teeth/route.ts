/**
 * Worksheet Teeth Assignment API Route
 *
 * POST /api/worksheets/:id/teeth - Assign/replace teeth selections (FDI notation)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
  badRequestResponse,
} from '@/lib/api/responses';
import { assignTeeth } from '@/src/lib/services/worksheet-service';
import { WorkType } from '@/src/types/worksheet';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for teeth assignment
 * Validates FDI notation and work types
 */
const assignTeethSchema = z.object({
  teeth: z.array(
    z.object({
      toothNumber: z.string().regex(/^\d{2}$/, 'Invalid FDI notation - must be 2 digits'),
      workType: z.enum([
        'CROWN',
        'BRIDGE',
        'VENEER',
        'DENTURE',
        'IMPLANT',
        'INLAY_ONLAY',
        'FILLING',
        'ORTHODONTICS',
        'OTHER',
      ] as const),
      shade: z.string().optional(),
      notes: z.string().optional(),
    })
  ), // Allow empty array to delete all teeth (replace-all pattern)
});

// ============================================================================
// POST /api/worksheets/:id/teeth
// ============================================================================

/**
 * POST /api/worksheets/:id/teeth
 * Assign or replace teeth selections for a worksheet
 *
 * Required permissions: ADMIN or TECHNICIAN
 * Status requirement: DRAFT only (locked after production starts)
 *
 * Uses "replace all" pattern:
 * - Deletes existing teeth assignments
 * - Creates new assignments from request
 * - Atomic operation (all or nothing)
 *
 * Request body:
 * {
 *   teeth: [
 *     {
 *       toothNumber: "16",  // FDI notation (11-48 permanent, 51-85 primary)
 *       workType: "CROWN",  // Type of dental work
 *       shade?: "A2",       // Optional tooth shade/color
 *       notes?: "..."       // Optional notes
 *     },
 *     ...
 *   ]
 * }
 *
 * FDI Notation Guide:
 * - Permanent teeth: 11-18 (UR), 21-28 (UL), 31-38 (LL), 41-48 (LR)
 * - Primary teeth: 51-55 (UR), 61-65 (UL), 71-75 (LL), 81-85 (LR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permissions
    const session = await requireRole(['ADMIN', 'TECHNICIAN']);

    const { id: worksheetId } = await params;

    // Validate request body
    const data = await validateRequestBody(request, assignTeethSchema);

    // Validate FDI numbers (additional server-side validation)
    const invalidTeeth = data.teeth.filter((tooth) => {
      const num = parseInt(tooth.toothNumber, 10);
      const quadrant = Math.floor(num / 10);
      const position = num % 10;

      // Validate quadrant (1-8)
      if (quadrant < 1 || quadrant > 8) return true;

      // Validate position for permanent teeth (1-8)
      if (quadrant <= 4 && (position < 1 || position > 8)) return true;

      // Validate position for primary teeth (1-5)
      if (quadrant > 4 && (position < 1 || position > 5)) return true;

      return false;
    });

    if (invalidTeeth.length > 0) {
      return badRequestResponse(
        `Invalid FDI notation: ${invalidTeeth.map((t) => t.toothNumber).join(', ')}`
      );
    }

    // Assign teeth (replaces existing assignments)
    await assignTeeth(worksheetId, data, session.user.id);

    return successResponse(
      { worksheetId, teethCount: data.teeth.length },
      `Successfully assigned ${data.teeth.length} teeth`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
