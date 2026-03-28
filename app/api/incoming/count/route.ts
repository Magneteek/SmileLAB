/**
 * GET /api/incoming/count
 * Returns the count of DRAFT worksheets for the sidebar badge.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ count: 0 });

  try {
    const count = await prisma.order.count({
      where: {
        status: 'PENDING',
        deletedAt: null,
        worksheets: { none: {} },
      },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
