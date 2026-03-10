/**
 * External Partners API Routes
 * GET /api/partners - List partners
 * POST /api/partners - Create new partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['DESIGN', 'MILLING', 'BOTH']),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/partners
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    const partners = await prisma.externalPartner.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: partners });
  } catch (error) {
    console.error('GET /api/partners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/partners
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createPartnerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const partner = await prisma.externalPartner.create({
      data: {
        name: result.data.name,
        type: result.data.type,
        email: result.data.email || null,
        phone: result.data.phone || null,
        notes: result.data.notes || null,
        isActive: result.data.isActive ?? true,
      },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error('POST /api/partners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
