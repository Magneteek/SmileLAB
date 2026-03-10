/**
 * External Partner Detail API Routes
 * PATCH /api/partners/[id] - Update partner
 * DELETE /api/partners/[id] - Delete partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePartnerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['DESIGN', 'MILLING', 'BOTH']).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/partners/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const result = updatePartnerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.externalPartner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const data = result.data;
    const partner = await prisma.externalPartner.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error('PATCH /api/partners/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: ADMIN role required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.externalPartner.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            designWorksheets: true,
            millingWorksheets: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const usageCount = existing._count.designWorksheets + existing._count.millingWorksheets;
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: partner is used in ${usageCount} worksheet(s). Deactivate instead.` },
        { status: 409 }
      );
    }

    await prisma.externalPartner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/partners/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
