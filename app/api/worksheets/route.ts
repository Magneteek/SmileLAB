/**
 * Worksheets API Route
 *
 * GET  /api/worksheets - List worksheets with filtering and pagination
 * POST /api/worksheets - Create new worksheet from order
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/api/auth-middleware';
import { validateRequestBody, parsePaginationParams } from '@/lib/api/validation';
import {
  successResponse,
  handleApiError,
} from '@/lib/api/responses';
import {
  getWorksheets,
  createWorksheetFromOrder,
} from '@/src/lib/services/worksheet-service';
import { WorksheetStatus } from '@/src/types/worksheet';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new worksheet
 */
const createWorksheetSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  deviceDescription: z.string().optional(),
  intendedUse: z.string().optional(),
  technicalNotes: z.string().optional(),
});

// ============================================================================
// GET /api/worksheets
// ============================================================================

/**
 * GET /api/worksheets
 * List worksheets with filters and pagination
 *
 * Query params:
 * - status: WorksheetStatus (single or comma-separated)
 * - dentistId: string
 * - patientId: string
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - search: string (worksheet number, patient name, etc.)
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - sortBy: string (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePaginationParams(searchParams);

    // Parse status (can be single or comma-separated)
    let status: WorksheetStatus | WorksheetStatus[] | undefined;
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statusArray = statusParam.split(',') as WorksheetStatus[];
      status = statusArray.length === 1 ? statusArray[0] : statusArray;
    }

    // Parse date filters
    const dateFrom = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : undefined;
    const dateTo = searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : undefined;

    // Build filters
    const filters = {
      status,
      dentistId: searchParams.get('dentistId') || undefined,
      patientId: searchParams.get('patientId') || undefined,
      dateFrom,
      dateTo,
      search: searchParams.get('search') || undefined,
    };

    // Fetch worksheets
    const result = await getWorksheets(filters, pagination);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/worksheets
// ============================================================================

/**
 * POST /api/worksheets
 * Create new worksheet from an order
 *
 * Required permissions: ADMIN or TECHNICIAN
 *
 * Request body:
 * {
 *   orderId: string,
 *   deviceDescription?: string,
 *   intendedUse?: string,
 *   technicalNotes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await requireRole(['ADMIN', 'TECHNICIAN']);

    // Validate request body
    const data = await validateRequestBody(request, createWorksheetSchema);

    // Create worksheet
    const worksheet = await createWorksheetFromOrder(data, session.user.id);

    return successResponse(
      worksheet,
      `Worksheet ${worksheet.worksheetNumber} created successfully`,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
