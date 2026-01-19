/**
 * SOP Acknowledgment API
 *
 * POST - Acknowledge that staff member has read and understood the SOP
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

    if (!session || session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sopId } = await params;

    // Check if SOP exists and is approved
    const sop = await prisma.sOP.findUnique({
      where: { id: sopId },
    });

    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    if (sop.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Only approved SOPs can be acknowledged' },
        { status: 400 }
      );
    }

    // Check if already acknowledged
    const existing = await prisma.sOPAcknowledgment.findUnique({
      where: {
        sopId_userId: {
          sopId,
          userId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'SOP already acknowledged' },
        { status: 400 }
      );
    }

    // Get IP address for audit trail
    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Create acknowledgment
    const acknowledgment = await prisma.sOPAcknowledgment.create({
      data: {
        sopId,
        userId: session.user.id,
        ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'SOP acknowledged successfully',
      acknowledgment,
    });
  } catch (error) {
    console.error('Acknowledge SOP error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge SOP' },
      { status: 500 }
    );
  }
}
