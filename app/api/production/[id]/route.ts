/**
 * Production Board - Worksheet Update API
 * PATCH /api/production/[id] - Update production tracking fields and/or due date
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  // Phase timestamps (pass null to un-check, string/Date to check)
  scanReceivedAt: z.string().datetime().nullable().optional(),
  designCompletedAt: z.string().datetime().nullable().optional(),
  millingSentAt: z.string().datetime().nullable().optional(),
  millingReceivedAt: z.string().datetime().nullable().optional(),

  // Design phase
  designType: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  designPartnerId: z.string().nullable().optional(),
  designSentAt: z.string().datetime().nullable().optional(),

  // Milling phase
  millingType: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  manufacturingMethod: z.enum(['MILLING', 'PRINTING']).optional(),
  millingPartnerId: z.string().nullable().optional(),

  // Scan info
  scanSource: z.enum(['MEDIT', 'SHINING3D', 'GOOGLE_DRIVE', 'THREESHAPE', 'OTHER']).nullable().optional(),
  scanReference: z.string().max(500).nullable().optional(),

  // Due date (on the order)
  dueDate: z.string().datetime().nullable().optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const worksheet = await prisma.workSheet.findUnique({
      where: { id },
      select: { id: true, orderId: true, status: true },
    });

    if (!worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
    }

    const { dueDate, ...worksheetFields } = result.data;

    // Update worksheet production fields
    const updateData: any = {};
    if (worksheetFields.scanReceivedAt !== undefined) updateData.scanReceivedAt = worksheetFields.scanReceivedAt ? new Date(worksheetFields.scanReceivedAt) : null;
    if (worksheetFields.designCompletedAt !== undefined) updateData.designCompletedAt = worksheetFields.designCompletedAt ? new Date(worksheetFields.designCompletedAt) : null;
    if (worksheetFields.millingSentAt !== undefined) updateData.millingSentAt = worksheetFields.millingSentAt ? new Date(worksheetFields.millingSentAt) : null;
    if (worksheetFields.millingReceivedAt !== undefined) updateData.millingReceivedAt = worksheetFields.millingReceivedAt ? new Date(worksheetFields.millingReceivedAt) : null;
    if (worksheetFields.designType !== undefined) updateData.designType = worksheetFields.designType;
    if (worksheetFields.designPartnerId !== undefined) updateData.designPartnerId = worksheetFields.designPartnerId;
    if (worksheetFields.designSentAt !== undefined) updateData.designSentAt = worksheetFields.designSentAt ? new Date(worksheetFields.designSentAt) : null;
    if (worksheetFields.millingType !== undefined) updateData.millingType = worksheetFields.millingType;
    if (worksheetFields.manufacturingMethod !== undefined) updateData.manufacturingMethod = worksheetFields.manufacturingMethod;
    if (worksheetFields.millingPartnerId !== undefined) updateData.millingPartnerId = worksheetFields.millingPartnerId;
    if (worksheetFields.scanSource !== undefined) updateData.scanSource = worksheetFields.scanSource;
    if (worksheetFields.scanReference !== undefined) updateData.scanReference = worksheetFields.scanReference;

    const [updatedWorksheet] = await prisma.$transaction([
      prisma.workSheet.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          scanReceivedAt: true,
          designCompletedAt: true,
          millingSentAt: true,
          millingReceivedAt: true,
          designType: true,
          designPartnerId: true,
          designSentAt: true,
          millingType: true,
          millingPartnerId: true,
          scanSource: true,
          scanReference: true,
          designPartner: { select: { id: true, name: true } },
          millingPartner: { select: { id: true, name: true } },
        },
      }),
      // Update order dueDate if provided
      ...(dueDate !== undefined
        ? [prisma.order.update({
            where: { id: worksheet.orderId },
            data: { dueDate: dueDate ? new Date(dueDate) : null },
          })]
        : []),
    ]);

    return NextResponse.json(updatedWorksheet);
  } catch (error) {
    console.error('PATCH /api/production/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
