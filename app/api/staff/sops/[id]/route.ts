/**
 * Staff SOP Detail API
 *
 * GET - View single SOP details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sop = await prisma.sOP.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        approvedBy: {
          select: {
            name: true,
          },
        },
        acknowledgments: {
          where: {
            userId: session.user.id,
          },
          select: {
            acknowledgedAt: true,
            ipAddress: true,
          },
        },
      },
    });

    if (!sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 });
    }

    // Staff can only view approved SOPs
    if (sop.status !== 'APPROVED') {
      return NextResponse.json({ error: 'SOP not available' }, { status: 403 });
    }

    // Add acknowledgment status
    const sopWithStatus = {
      ...sop,
      acknowledged: sop.acknowledgments.length > 0,
      acknowledgedAt: sop.acknowledgments[0]?.acknowledgedAt || null,
    };

    return NextResponse.json(sopWithStatus);
  } catch (error) {
    console.error('Fetch SOP error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOP' },
      { status: 500 }
    );
  }
}
