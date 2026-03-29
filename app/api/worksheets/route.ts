/**
 * Worksheets API Route
 *
 * GET  /api/worksheets - List worksheets with filtering and pagination
 * POST /api/worksheets - Create new worksheet from order
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createWorksheetSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  deviceDescription: z.string().optional(),
  intendedUse: z.string().optional(),
  technicalNotes: z.string().optional(),
  technicianName: z.string().optional(),
});

// ============================================================================
// GET /api/worksheets
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get('status');
    const statusFilter = statusParam ? statusParam.split(',') : undefined;

    const where: any = { deletedAt: null };
    if (statusFilter) where.status = { in: statusFilter };
    if (searchParams.get('dentistId')) where.dentistId = searchParams.get('dentistId');
    if (searchParams.get('search')) {
      where.OR = [
        { worksheetNumber: { contains: searchParams.get('search'), mode: 'insensitive' } },
        { patientName: { contains: searchParams.get('search'), mode: 'insensitive' } },
      ];
    }

    const [total, worksheets] = await Promise.all([
      prisma.workSheet.count({ where }),
      prisma.workSheet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true, orderNumber: true, dueDate: true,
              dentist: { select: { id: true, clinicName: true, dentistName: true } },
            },
          },
          dentist: { select: { id: true, clinicName: true, dentistName: true } },
          products: { include: { product: true }, take: 3 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { worksheets, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/worksheets error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch worksheets' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/worksheets
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createWorksheetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { orderId, deviceDescription, intendedUse, technicalNotes, technicianName } = result.data;

    // Validate order exists and is in a valid state
    const order = await prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { dentist: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Check if order already has an active worksheet
    const existingWorksheet = await prisma.workSheet.findFirst({
      where: {
        orderId,
        deletedAt: null,
        status: { notIn: ['VOIDED', 'CANCELLED'] },
      },
    });

    if (existingWorksheet) {
      return NextResponse.json(
        { success: false, error: 'Order already has an active worksheet' },
        { status: 409 }
      );
    }

    // Get next revision number
    const lastRevision = await prisma.workSheet.findFirst({
      where: { orderId },
      orderBy: { revision: 'desc' },
      select: { revision: true },
    });
    const revision = (lastRevision?.revision ?? 0) + 1;

    // Generate worksheet number: DN-YYXXX (same year+seq as order number)
    const worksheetNumber = `DN-${order.orderNumber}`;

    const worksheet = await prisma.$transaction(async (tx) => {
      const ws = await tx.workSheet.create({
        data: {
          worksheetNumber,
          revision,
          orderId,
          dentistId: order.dentistId,
          createdById: session.user.id,
          patientName: order.patientName,
          status: 'DRAFT',
          deviceDescription: deviceDescription ?? null,
          intendedUse: intendedUse ?? null,
          technicalNotes: technicalNotes ?? null,
          technicianName: technicianName ?? null,
        },
        include: {
          order: { select: { id: true, orderNumber: true } },
          dentist: { select: { id: true, clinicName: true, dentistName: true } },
        },
      });

      // Update order status to IN_PRODUCTION
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'IN_PRODUCTION' },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'WorkSheet',
          entityId: ws.id,
          newValues: JSON.stringify({ worksheetNumber, orderId, revision }),
        },
      });

      return ws;
    });

    return NextResponse.json({ success: true, data: worksheet }, { status: 201 });
  } catch (error) {
    console.error('POST /api/worksheets error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create worksheet' }, { status: 500 });
  }
}
