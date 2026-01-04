/**
 * Worksheet Materials Assignment API Route
 *
 * POST /api/worksheets/:id/materials - Assign/replace material selections
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import { assignMaterials } from '@/src/lib/services/worksheet-service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for materials assignment
 * Validates material IDs, quantities, and optional LOT selection
 *
 * Note: Product-material associations are NOT managed via this endpoint.
 * They should be managed from the Products tab.
 */
const assignMaterialsSchema = z.object({
  materials: z.array(
    z.object({
      materialId: z.string().min(1, 'Material ID is required'),
      quantityNeeded: z.number().positive('Quantity must be positive'),
      materialLotId: z.string().optional(), // Optional LOT selection (defaults to FIFO if not provided)
    })
  ), // Allow empty array to delete all materials (replace-all pattern)
});

// ============================================================================
// POST /api/worksheets/:id/materials
// ============================================================================

/**
 * POST /api/worksheets/:id/materials
 * Assign or replace material selections for a worksheet
 *
 * Required permissions: ADMIN or TECHNICIAN
 * Status requirement: DRAFT only (locked after production starts)
 *
 * Uses "replace all" pattern:
 * - Deletes existing material assignments
 * - Creates new assignments from request
 * - NO immediate stock consumption (deferred until IN_PRODUCTION)
 * - Atomic operation (all or nothing)
 *
 * Material Consumption Flow:
 * 1. DRAFT status: Materials assigned but NOT consumed
 * 2. DRAFT → IN_PRODUCTION: FIFO consumption happens automatically
 * 3. IN_PRODUCTION+: Material assignments locked (cannot change)
 *
 * Request body:
 * {
 *   materials: [
 *     {
 *       materialId: "mat_123",
 *       quantityNeeded: 50.5  // Quantity in material's unit (g, ml, pieces)
 *     },
 *     ...
 *   ]
 * }
 *
 * FIFO Consumption (triggered on status transition):
 * - Selects oldest LOT first (First In, First Out)
 * - Assigns specific LOT numbers for traceability
 * - Deducts from available stock
 * - Creates audit trail for EU MDR compliance
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
    const data = await validateRequestBody(request, assignMaterialsSchema);

    console.log('📥 API received materials data:', JSON.stringify(data, null, 2));

    // Assign materials (replaces existing assignments)
    // NOTE: This does NOT consume stock yet - consumption happens on
    // DRAFT → IN_PRODUCTION transition via FIFO algorithm
    await assignMaterials(worksheetId, data, session.user.id);

    return successResponse(
      {
        worksheetId,
        materialsCount: data.materials.length,
        note: 'Materials assigned. Stock will be consumed when worksheet enters production.',
      },
      `Successfully assigned ${data.materials.length} materials`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
