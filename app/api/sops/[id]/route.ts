/**
 * SOP API - Get, Update, Delete
 *
 * GET /api/sops/[id] - Get single SOP
 * PUT /api/sops/[id] - Update SOP
 * DELETE /api/sops/[id] - Delete SOP (DRAFT only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sopService } from '@/lib/services/sop-service';
import { SOPCategory, SOPStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for updating SOP
const updateSOPSchema = z.object({
  title: z.string().min(3).optional(),
  category: z.nativeEnum(SOPCategory).optional(),
  content: z.string().min(10).optional(),
  pdfPath: z.string().optional(),
  status: z.nativeEnum(SOPStatus).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get SOP
    const sop = await sopService.getSOPById(id);

    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    return NextResponse.json(sop);
  } catch (error: any) {
    console.error('Get SOP error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOP' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can update SOPs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validation = updateSOPSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Update SOP (will create new version if APPROVED)
    const sop = await sopService.updateSOP(id, validation.data, session.user.id);

    return NextResponse.json(sop);
  } catch (error: any) {
    console.error('Update SOP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update SOP' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete SOPs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Delete SOP
    await sopService.deleteSOP(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete SOP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete SOP' },
      { status: 500 }
    );
  }
}
