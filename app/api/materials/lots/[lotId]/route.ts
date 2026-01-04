// Material LOT By ID API Routes
// GET: Get single LOT with traceability
// PATCH: Update LOT status or quantity

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateLotStatus,
  getLotTraceability,
  deleteMaterialLot,
} from '@/lib/services/material-service';
import { UpdateLotDto } from '@/types/material';
import { MaterialLotStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/materials/lots/[lotId]
 * Get single LOT details with traceability
 * Query params:
 * - includeTraceability: boolean (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lotId } = await params;

    // Check if traceability is requested
    const searchParams = request.nextUrl.searchParams;
    const includeTraceability = searchParams.get('includeTraceability') === 'true';

    // Get LOT
    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: {
        material: true,
        ...(includeTraceability && {
          worksheetMaterials: {
            include: {
              worksheet: {
                include: {
                  dentist: true,
                },
              },
            },
          },
        }),
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Material LOT not found' }, { status: 404 });
    }

    return NextResponse.json(lot);
  } catch (error) {
    console.error('GET /api/materials/lots/[lotId] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material LOT' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/lots/[lotId]
 * Update LOT status or quantity
 * Auth: ADMIN
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lotId } = await params;

    // Check role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN role required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate status if provided
    if (body.status && !Object.values(MaterialLotStatus).includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(MaterialLotStatus).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate quantity if provided
    if (body.quantityAvailable !== undefined) {
      const quantity = parseFloat(body.quantityAvailable);
      if (isNaN(quantity) || quantity < 0) {
        return NextResponse.json(
          { error: 'quantityAvailable must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // Validate expiry date if provided
    if (body.expiryDate !== undefined && body.expiryDate !== null) {
      const expiryDate = new Date(body.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiryDate format' },
          { status: 400 }
        );
      }
    }

    // Build DTO
    const dto: UpdateLotDto = {};

    if (body.lotNumber !== undefined) dto.lotNumber = body.lotNumber.trim();
    if (body.expiryDate !== undefined) {
      dto.expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    }
    if (body.supplierName !== undefined) dto.supplierName = body.supplierName.trim();
    if (body.quantityAvailable !== undefined) {
      dto.quantityAvailable = parseFloat(body.quantityAvailable);
    }
    if (body.status !== undefined) dto.status = body.status as MaterialLotStatus;
    if (body.notes !== undefined) dto.notes = body.notes?.trim() || null;

    // Update LOT
    const lot = await updateLotStatus(lotId, dto, session.user.id);

    return NextResponse.json(lot);
  } catch (error) {
    console.error('PATCH /api/materials/lots/[lotId] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update material LOT' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/lots/[lotId]
 * Smart delete LOT (Option A)
 * Auth: ADMIN only
 * - Prevents deletion if LOT has been used in worksheets (MDR compliance)
 * - Allows deletion only for unused LOTs (mistake correction)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN role required' },
        { status: 403 }
      );
    }

    const { lotId } = await params;

    // Delete LOT (will throw if used in worksheets)
    await deleteMaterialLot(lotId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Material LOT deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/materials/lots/[lotId] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Cannot delete')) {
        // MDR compliance violation - LOT has been used
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to delete material LOT' },
      { status: 500 }
    );
  }
}
