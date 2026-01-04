/**
 * Single Worksheet API Route
 *
 * GET    /api/worksheets/[id] - Get worksheet details
 * PATCH  /api/worksheets/[id] - Update worksheet
 * DELETE /api/worksheets/[id] - Delete worksheet (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getWorksheetById,
  updateWorksheet,
  deleteWorksheet,
  assignTeeth,
  assignProducts,
  assignMaterials
} from '@/src/lib/services/worksheet-service';

/**
 * GET /api/worksheets/[id]
 * Get single worksheet with all relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const worksheet = await getWorksheetById(id);

    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: 'Worksheet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: worksheet,
    });
  } catch (error) {
    console.error('GET /api/worksheets/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch worksheet',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/worksheets/[id]
 * Update worksheet (teeth, products, materials, notes, etc.)
 *
 * CRITICAL ORDER OF OPERATIONS:
 * 1. Update basic worksheet fields first
 * 2. Assign products second (creates WorksheetProduct records)
 * 3. Assign materials third (can now reference WorksheetProduct IDs)
 * 4. Assign teeth last
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role - only ADMIN and TECHNICIAN can update worksheets
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Extract different types of updates
    const { teeth, products, materials, ...worksheetFields } = body;

    // Step 1: Update basic worksheet fields (if any)
    let worksheet = null;
    if (Object.keys(worksheetFields).length > 0) {
      worksheet = await updateWorksheet(id, worksheetFields, session.user.id);
    }

    // Step 2: Assign products FIRST (creates WorksheetProduct records)
    if (products && Array.isArray(products)) {
      await assignProducts(id, { products }, session.user.id);
    }

    // Step 3: Assign materials SECOND (can now reference WorksheetProduct IDs from step 2)
    if (materials && Array.isArray(materials)) {
      await assignMaterials(id, { materials }, session.user.id);
    }

    // Step 4: Assign teeth LAST
    if (teeth && Array.isArray(teeth)) {
      await assignTeeth(id, { teeth }, session.user.id);
    }

    // Fetch updated worksheet with all relations
    const updatedWorksheet = await getWorksheetById(id);

    return NextResponse.json({
      success: true,
      data: updatedWorksheet,
    });
  } catch (error) {
    console.error('PATCH /api/worksheets/[id] error:', error);

    // Business logic error
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update worksheet' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worksheets/[id]
 * Soft delete worksheet (only allowed before DELIVERED)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role - only ADMIN and TECHNICIAN can delete worksheets
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Delete worksheet (soft delete)
    await deleteWorksheet(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Worksheet deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/worksheets/[id] error:', error);

    // Business logic error
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete worksheet' },
      { status: 500 }
    );
  }
}
