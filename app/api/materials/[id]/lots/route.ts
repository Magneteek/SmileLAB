// Material LOTs API Routes
// GET: Get all LOTs for a material
// POST: Record stock arrival (create MaterialLot)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getMaterialLots,
  recordStockArrival,
  getMaterialById,
} from '@/lib/services/material-service';
import { CreateLotDto, MaterialLotFilters } from '@/types/material';
import { MaterialLotStatus } from '@prisma/client';
import { DuplicateLotError } from '@/types/material';

/**
 * GET /api/materials/[id]/lots
 * Get all LOTs for a material with optional filtering
 * Query params:
 * - status: MaterialLotStatus
 * - expiringWithinDays: number
 * - page: number
 * - pageSize: number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify material exists
    const { id } = await params;
    const material = await getMaterialById(id);
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Build filters
    const filters: MaterialLotFilters = {
      materialId: id,
    };

    const status = searchParams.get('status');
    if (status && Object.values(MaterialLotStatus).includes(status as MaterialLotStatus)) {
      filters.status = status as MaterialLotStatus;
    }

    const expiringWithinDays = searchParams.get('expiringWithinDays');
    if (expiringWithinDays) {
      filters.expiringWithinDays = parseInt(expiringWithinDays, 10);
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Get LOTs
    const result = await getMaterialLots(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/materials/[id]/lots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material LOTs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/[id]/lots
 * Record stock arrival (create MaterialLot)
 * Auth: ADMIN, TECHNICIAN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role (ADMIN or TECHNICIAN can record arrivals)
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN or TECHNICIAN role required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.lotNumber || !body.supplierName || !body.quantityReceived) {
      return NextResponse.json(
        { error: 'Missing required fields: lotNumber, supplierName, quantityReceived' },
        { status: 400 }
      );
    }

    // Validate quantity
    const quantity = parseFloat(body.quantityReceived);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'quantityReceived must be a positive number' },
        { status: 400 }
      );
    }

    // Validate expiry date if provided
    let expiryDate: Date | undefined;
    if (body.expiryDate) {
      expiryDate = new Date(body.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiryDate format' },
          { status: 400 }
        );
      }
      // Expiry date must be in the future
      if (expiryDate <= new Date()) {
        return NextResponse.json(
          { error: 'expiryDate must be in the future' },
          { status: 400 }
        );
      }
    }

    // Validate arrival date if provided
    let arrivalDate: Date | undefined;
    if (body.arrivalDate) {
      arrivalDate = new Date(body.arrivalDate);
      if (isNaN(arrivalDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid arrivalDate format' },
          { status: 400 }
        );
      }
    }

    // Build DTO
    const dto: CreateLotDto = {
      materialId: id,
      lotNumber: body.lotNumber.trim(),
      supplierName: body.supplierName.trim(),
      quantityReceived: quantity,
      arrivalDate,
      expiryDate,
      notes: body.notes?.trim(),
    };

    // Create LOT
    const lot = await recordStockArrival(dto, session.user.id);

    return NextResponse.json(lot, { status: 201 });
  } catch (error) {
    console.error('POST /api/materials/[id]/lots error:', error);

    if (error instanceof DuplicateLotError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to record stock arrival' },
      { status: 500 }
    );
  }
}
