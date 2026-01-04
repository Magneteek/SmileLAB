/**
 * Void Worksheet API Route
 *
 * POST /api/worksheets/[id]/void
 * Voids a worksheet due to an error, preserving it for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Void reason is required' },
        { status: 400 }
      );
    }

    // Get worksheet
    const worksheet = await prisma.workSheet.findUnique({
      where: { id },
      select: {
        id: true,
        worksheetNumber: true,
        status: true,
        orderId: true,
      },
    });

    if (!worksheet) {
      return NextResponse.json(
        { error: 'Worksheet not found' },
        { status: 404 }
      );
    }

    // Check if worksheet can be voided
    // Can only void QC_APPROVED or DELIVERED worksheets
    const voidableStatuses = ['QC_APPROVED', 'DELIVERED'];
    if (!voidableStatuses.includes(worksheet.status)) {
      return NextResponse.json(
        {
          error: `Cannot void worksheet with status ${worksheet.status}. Only QC_APPROVED or DELIVERED worksheets can be voided.`,
        },
        { status: 400 }
      );
    }

    // Void the worksheet
    const voidedWorksheet = await prisma.workSheet.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        voidedAt: new Date(),
        voidedBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'WorkSheet',
        entityId: id,
        oldValues: JSON.stringify({ status: worksheet.status }),
        newValues: JSON.stringify({
          status: 'VOIDED',
          voidReason: reason,
        }),
      },
    });

    console.log(
      `[Worksheet Void] ${worksheet.worksheetNumber} voided by ${session.user.name}. Reason: ${reason}`
    );

    return NextResponse.json({
      success: true,
      worksheet: voidedWorksheet,
      message: `Worksheet ${worksheet.worksheetNumber} has been voided`,
    });
  } catch (error: any) {
    console.error('Failed to void worksheet:', error);
    return NextResponse.json(
      { error: 'Failed to void worksheet' },
      { status: 500 }
    );
  }
}
