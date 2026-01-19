/**
 * Staff SOP List API
 *
 * Returns APPROVED SOPs only (staff can't see drafts)
 * Includes acknowledgment status for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {
      status: 'APPROVED', // Only show approved SOPs to staff
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    const sops = await prisma.sOP.findMany({
      where,
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
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    // Transform to include acknowledged status
    const sopsWithStatus = sops.map((sop) => ({
      ...sop,
      acknowledged: sop.acknowledgments.length > 0,
      acknowledgedAt: sop.acknowledgments[0]?.acknowledgedAt || null,
    }));

    return NextResponse.json(sopsWithStatus);
  } catch (error) {
    console.error('Fetch SOPs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOPs' },
      { status: 500 }
    );
  }
}
