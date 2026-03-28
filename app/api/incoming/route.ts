/**
 * Incoming Orders Triage API
 * GET  /api/incoming - List all DRAFT worksheets (unprocessed incoming)
 * POST /api/incoming - Quick-create Order + Worksheet in one step
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Maps the UI source selector to DB fields
const SOURCE_MAP: Record<string, { impressionType: string; scanSource: string | null }> = {
  MEDIT:        { impressionType: 'DIGITAL_SCAN',    scanSource: 'MEDIT' },
  SHINING3D:    { impressionType: 'DIGITAL_SCAN',    scanSource: 'SHINING3D' },
  GOOGLE_DRIVE: { impressionType: 'DIGITAL_SCAN',    scanSource: 'GOOGLE_DRIVE' },
  THREESHAPE:   { impressionType: 'DIGITAL_SCAN',    scanSource: 'THREESHAPE' },
  EMAIL:        { impressionType: 'PHYSICAL_IMPRINT', scanSource: null },
  PHYSICAL:     { impressionType: 'PHYSICAL_IMPRINT', scanSource: null },
};

const createIncomingSchema = z.object({
  source:       z.enum(['MEDIT', 'SHINING3D', 'GOOGLE_DRIVE', 'THREESHAPE', 'EMAIL', 'PHYSICAL']),
  scanReference: z.string().optional().nullable(),
  dentistId:    z.string().min(1, 'Dentist is required'),
  patientName:  z.string().optional().nullable(),
  dueDate:      z.string().optional().nullable(),
  priority:     z.number().int().min(0).max(2).optional().default(0),
  notes:        z.string().optional().nullable(),
});

/**
 * GET /api/incoming
 * Returns all DRAFT worksheets, newest first
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [worksheets, ordersWithoutWorksheet] = await Promise.all([
      prisma.workSheet.findMany({
        where: { status: 'DRAFT', deletedAt: null },
        select: {
          id: true,
          worksheetNumber: true,
          patientName: true,
          scanSource: true,
          scanReference: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              dueDate: true,
              priority: true,
              impressionType: true,
              notes: true,
            },
          },
          dentist: { select: { id: true, dentistName: true, clinicName: true } },
          products: {
            take: 3,
            select: {
              id: true,
              quantity: true,
              product: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.findMany({
        where: {
          status: 'PENDING',
          deletedAt: null,
          worksheets: { none: {} },
        },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          dueDate: true,
          priority: true,
          impressionType: true,
          notes: true,
          patientName: true,
          createdAt: true,
          dentist: { select: { id: true, dentistName: true, clinicName: true } },
        },
        orderBy: { orderDate: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: worksheets,
      orders: ordersWithoutWorksheet,
      count: worksheets.length,
    });
  } catch (error) {
    console.error('GET /api/incoming error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/incoming
 * Creates an Order + Worksheet atomically from a single quick-add form.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const result = createIncomingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { source, scanReference, dentistId, patientName, dueDate, priority, notes } = result.data;
    const { impressionType, scanSource } = SOURCE_MAP[source];

    // Validate dentist exists
    const dentist = await prisma.dentist.findFirst({
      where: { id: dentistId, deletedAt: null },
    });
    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 });
    }

    const { order, worksheet } = await prisma.$transaction(async (tx) => {
      // ── 1. Generate order number (same logic as order-service) ──
      const currentYear = new Date().getFullYear();
      const configKey = `next_order_number_${currentYear}`;
      let config = await tx.systemConfig.findUnique({ where: { key: configKey } });
      if (!config) {
        config = await tx.systemConfig.create({
          data: {
            key: configKey,
            value: '1',
            description: `Next sequential order number for year ${currentYear}`,
          },
        });
      }
      const currentNumber = parseInt(config.value, 10);
      await tx.systemConfig.update({
        where: { key: configKey },
        data: { value: (currentNumber + 1).toString() },
      });
      const yearSuffix = currentYear.toString().slice(-2);
      const orderNumber = `${yearSuffix}${currentNumber.toString().padStart(3, '0')}`;
      const worksheetNumber = `DN-${orderNumber}`;

      // ── 2. Create Order ──
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          dentistId,
          createdById: session.user.id,
          patientName: patientName ?? null,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority ?? 0,
          impressionType: impressionType as any,
          notes: notes ?? null,
          status: 'IN_PRODUCTION',
        },
      });

      // ── 3. Create Worksheet ──
      const newWorksheet = await tx.workSheet.create({
        data: {
          worksheetNumber,
          revision: 1,
          orderId: newOrder.id,
          dentistId,
          createdById: session.user.id,
          patientName: patientName ?? null,
          status: 'DRAFT',
          scanSource: scanSource as any ?? null,
          scanReference: scanReference ?? null,
        },
        include: {
          order: { select: { id: true, orderNumber: true } },
          dentist: { select: { id: true, clinicName: true, dentistName: true } },
        },
      });

      // ── 4. Audit log ──
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'Order',
          entityId: newOrder.id,
          newValues: JSON.stringify({ orderNumber, source, scanReference, dentistId }),
        },
      });

      return { order: newOrder, worksheet: newWorksheet };
    });

    return NextResponse.json({ success: true, data: { order, worksheet } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/incoming error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
