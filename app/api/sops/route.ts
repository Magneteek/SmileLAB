/**
 * SOPs API - List and Create
 *
 * GET /api/sops - List all SOPs (with filters)
 * POST /api/sops - Create new SOP
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sopService } from '@/lib/services/sop-service';
import { SOPCategory, SOPStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for creating SOP
const createSOPSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.nativeEnum(SOPCategory),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  pdfPath: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and QC can view all SOPs in management
    if (!['ADMIN', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get filters from query params
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as SOPCategory | null;
    const status = searchParams.get('status') as SOPStatus | null;
    const search = searchParams.get('search');

    const filters: any = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const sops = await sopService.getSOPs(filters);

    return NextResponse.json(sops);
  } catch (error: any) {
    console.error('Get SOPs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOPs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can create SOPs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validation = createSOPSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, category, content, pdfPath } = validation.data;

    // Create SOP
    const sop = await sopService.createSOP({
      title,
      category,
      content,
      pdfPath,
      createdById: session.user.id,
    });

    return NextResponse.json(sop, { status: 201 });
  } catch (error: any) {
    console.error('Create SOP error:', error);
    return NextResponse.json(
      { error: 'Failed to create SOP' },
      { status: 500 }
    );
  }
}
