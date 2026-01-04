/**
 * Rollback Worksheet to Draft API Route
 *
 * POST /api/worksheets/[id]/rollback
 * Rolls back a worksheet from IN_PRODUCTION to DRAFT for corrections
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
        { error: 'Rollback reason is required' },
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
      },
    });

    if (!worksheet) {
      return NextResponse.json(
        { error: 'Worksheet not found' },
        { status: 404 }
      );
    }

    // Check if worksheet can be rolled back
    // Can only rollback IN_PRODUCTION worksheets
    if (worksheet.status !== 'IN_PRODUCTION') {
      return NextResponse.json(
        {
          error: `Cannot rollback worksheet with status ${worksheet.status}. Only IN_PRODUCTION worksheets can be rolled back to DRAFT.`,
        },
        { status: 400 }
      );
    }

    // Rollback to draft
    const rolledBackWorksheet = await prisma.workSheet.update({
      where: { id },
      data: {
        status: 'DRAFT',
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
        oldValues: JSON.stringify({ status: 'IN_PRODUCTION' }),
        newValues: JSON.stringify({
          status: 'DRAFT',
          rollbackReason: reason,
        }),
      },
    });

    console.log(
      `[Worksheet Rollback] ${worksheet.worksheetNumber} rolled back to DRAFT by ${session.user.name}. Reason: ${reason}`
    );

    return NextResponse.json({
      success: true,
      worksheet: rolledBackWorksheet,
      message: `Worksheet ${worksheet.worksheetNumber} has been rolled back to DRAFT`,
    });
  } catch (error: any) {
    console.error('Failed to rollback worksheet:', error);
    return NextResponse.json(
      { error: 'Failed to rollback worksheet' },
      { status: 500 }
    );
  }
}
