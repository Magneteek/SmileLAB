// Material By ID API Routes
// GET: Get single material with all LOTs
// PATCH: Update material
// DELETE: Soft delete material

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from '@/lib/services/material-service';
import { UpdateMaterialDto } from '@/types/material';
import { MaterialType } from '@prisma/client';

/**
 * GET /api/materials/[id]
 * Get single material with all LOTs and availability status
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

    const { id } = await params;
    const material = await getMaterialById(id);

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error('GET /api/materials/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/[id]
 * Update material
 * Auth: ADMIN, TECHNICIAN
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role (ADMIN or TECHNICIAN can update materials)
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN or TECHNICIAN role required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate material type if provided
    if (body.type && !Object.values(MaterialType).includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid material type. Must be one of: ${Object.values(MaterialType).join(', ')}` },
        { status: 400 }
      );
    }

    // Build DTO
    const dto: UpdateMaterialDto = {};

    if (body.code !== undefined) dto.code = body.code.trim();
    if (body.name !== undefined) dto.name = body.name.trim();
    if (body.type !== undefined) dto.type = body.type as MaterialType;
    if (body.manufacturer !== undefined) dto.manufacturer = body.manufacturer.trim();
    if (body.description !== undefined) dto.description = body.description?.trim() || null;
    if (body.biocompatible !== undefined) dto.biocompatible = body.biocompatible;
    if (body.iso10993Cert !== undefined) dto.iso10993Cert = body.iso10993Cert?.trim() || null;
    if (body.ceMarked !== undefined) dto.ceMarked = body.ceMarked;
    if (body.ceNumber !== undefined) dto.ceNumber = body.ceNumber?.trim() || null;
    if (body.unit !== undefined) dto.unit = body.unit;
    if (body.active !== undefined) dto.active = body.active;

    // Update material
    const { id } = await params;
    const material = await updateMaterial(id, dto, session.user.id);

    return NextResponse.json(material);
  } catch (error) {
    console.error('PATCH /api/materials/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]
 * Smart delete material (Option A)
 * Auth: ADMIN only
 * - Prevents deletion if material/LOTs have been used (MDR compliance)
 * - Allows deletion only for unused materials (mistake correction)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Delete material
    const { id } = await params;
    await deleteMaterial(id, session.user.id);

    return NextResponse.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    console.error('DELETE /api/materials/[id] error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Cannot delete')) {
        // MDR compliance violation - material/LOT has been used
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    );
  }
}
