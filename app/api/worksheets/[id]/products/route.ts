/**
 * Worksheet Products Assignment API Route
 *
 * POST /api/worksheets/:id/products - Assign/replace product selections
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import { assignProducts } from '@/src/lib/services/worksheet-service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for products assignment
 * Validates product IDs, quantities, prices, and optional material associations
 * Now supports: multiple instances, LOT selection, tooth association
 */
const assignProductsSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be positive'),
      priceAtSelection: z.number().positive('Price must be positive'),
      notes: z.string().optional(),
      materials: z.array(
        z.object({
          materialId: z.string().min(1, 'Material ID is required'),
          materialLotId: z.string().optional(),  // Optional LOT selection
          quantityUsed: z.number().positive('Quantity must be positive'),
          toothNumber: z.string().optional(),    // Optional FDI notation
          notes: z.string().optional(),          // Optional clarification
          position: z.number().int().optional(), // Optional sequence
        })
      ).optional(), // Optional material associations (supports duplicates)
    })
  ), // Allow empty array to delete all products (replace-all pattern)
});

// ============================================================================
// POST /api/worksheets/:id/products
// ============================================================================

/**
 * POST /api/worksheets/:id/products
 * Assign or replace product selections for a worksheet
 *
 * Required permissions: ADMIN or TECHNICIAN
 * Status requirement: DRAFT only (locked after production starts)
 *
 * Uses "replace all" pattern:
 * - Deletes existing product assignments
 * - Creates new assignments from request
 * - Captures price snapshot for historical accuracy
 * - Atomic operation (all or nothing)
 *
 * Request body:
 * {
 *   products: [
 *     {
 *       productId: "prod_123",
 *       quantity: 1,
 *       priceAtSelection: 250.00,  // Current price (will be frozen)
 *       notes?: "Custom shade required",
 *       materials?: [  // Optional material associations
 *         {
 *           materialId: "mat_456",
 *           quantityUsed: 5.5  // Quantity in material's unit (g, ml, pieces)
 *         }
 *       ]
 *     },
 *     ...
 *   ]
 * }
 *
 * Price Versioning:
 * - priceAtSelection is captured and frozen
 * - Future price changes won't affect this worksheet
 * - Ensures historical accuracy for invoicing
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
    const data = await validateRequestBody(request, assignProductsSchema);

    // Assign products (replaces existing assignments)
    await assignProducts(worksheetId, data, session.user.id);

    // Calculate total cost
    const totalCost = data.products.reduce(
      (sum, p) => sum + p.quantity * p.priceAtSelection,
      0
    );

    return successResponse(
      {
        worksheetId,
        productsCount: data.products.length,
        totalCost: totalCost.toFixed(2),
      },
      `Successfully assigned ${data.products.length} products`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
