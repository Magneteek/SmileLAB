/**
 * Bulk SOP Acknowledgment API
 *
 * POST /api/staff/sops/bulk-acknowledge - Acknowledge multiple SOPs at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sopIds } = body;

    if (!Array.isArray(sopIds) || sopIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: sopIds array is required' },
        { status: 400 }
      );
    }

    // Get IP address for audit trail
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Verify all SOPs exist and are approved
    const sops = await prisma.sOP.findMany({
      where: {
        id: { in: sopIds },
        status: 'APPROVED', // Only approved SOPs can be acknowledged
      },
    });

    if (sops.length !== sopIds.length) {
      return NextResponse.json(
        { error: 'One or more SOPs not found or not approved' },
        { status: 404 }
      );
    }

    // Check which SOPs are already acknowledged by this user
    const existingAcknowledgments = await prisma.sOPAcknowledgment.findMany({
      where: {
        sopId: { in: sopIds },
        userId: session.user.id,
      },
      select: { sopId: true },
    });

    const alreadyAcknowledged = new Set(existingAcknowledgments.map((ack) => ack.sopId));
    const toAcknowledge = sopIds.filter((id) => !alreadyAcknowledged.has(id));

    if (toAcknowledge.length === 0) {
      return NextResponse.json({
        message: 'All SOPs already acknowledged',
        acknowledged: 0,
        skipped: sopIds.length,
      });
    }

    // Create acknowledgments for SOPs not yet acknowledged
    const acknowledgments = await prisma.sOPAcknowledgment.createMany({
      data: toAcknowledge.map((sopId) => ({
        sopId,
        userId: session.user.id,
        ipAddress,
      })),
    });

    return NextResponse.json({
      message: 'SOPs acknowledged successfully',
      acknowledged: acknowledgments.count,
      skipped: alreadyAcknowledged.size,
    });
  } catch (error: any) {
    console.error('Bulk acknowledge SOPs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to acknowledge SOPs' },
      { status: 500 }
    );
  }
}
