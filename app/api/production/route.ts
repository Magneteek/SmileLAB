/**
 * Production Board API
 * GET /api/production - List worksheets in production with tracking data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const worksheets = await prisma.workSheet.findMany({
      where: {
        status: { in: ['DRAFT', 'IN_PRODUCTION', 'QC_PENDING', 'QC_REJECTED'] },
        deletedAt: null,
      },
      select: {
        id: true,
        worksheetNumber: true,
        patientName: true,
        status: true,
        scanSource: true,
        scanReference: true,
        designType: true,
        designSentAt: true,
        designCompletedAt: true,
        millingType: true,
        manufacturingMethod: true,
        millingSentAt: true,
        millingReceivedAt: true,
        scanReceivedAt: true,
        technicalNotes: true,
        technicianName: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            dueDate: true,
            priority: true,
            impressionType: true,
            dentist: {
              select: { id: true, dentistName: true, clinicName: true },
            },
          },
        },
        dentist: {
          select: {
            id: true,
            dentistName: true,
            clinicName: true,
          },
        },
        designPartner: {
          select: { id: true, name: true, type: true },
        },
        millingPartner: {
          select: { id: true, name: true, type: true },
        },
        products: {
          take: 3,
          select: {
            id: true,
            quantity: true,
            product: {
              select: { name: true, code: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [
        { order: { dueDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: worksheets });
  } catch (error) {
    console.error('GET /api/production error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
