/**
 * Available Orders for Worksheet API Route
 *
 * GET /api/orders/available-for-worksheet
 * Returns orders that don't have an active worksheet (PENDING status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/orders/available-for-worksheet
 * List orders without active worksheets
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get orders that can have new worksheets created:
    // 1. PENDING status (no worksheet yet)
    // 2. Any status where the latest worksheet is VOIDED (allows creating revision worksheets)
    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: 'PENDING' }, // No worksheet yet
          {
            worksheets: {
              some: {
                status: 'VOIDED', // Has voided worksheet, can create revision
                deletedAt: null,
              },
            },
          },
        ],
      },
      include: {
        dentist: {
          select: {
            id: true,
            clinicName: true,
            dentistName: true,
          },
        },
        worksheets: {
          where: { deletedAt: null },
          orderBy: { revision: 'desc' },
          take: 1, // Get latest worksheet to check status
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
    });

    // Format for dropdown display
    const formattedOrders = orders.map((order: any) => {
      const hasVoidedWorksheet = order.worksheets?.[0]?.status === 'VOIDED';
      const nextRevision = hasVoidedWorksheet ? order.worksheets[0].revision + 1 : 1;
      const suffix = hasVoidedWorksheet ? ` (Create Rev ${nextRevision})` : '';

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        patientName: order.patientName || 'No patient name',
        dentist: {
          clinicName: order.dentist.clinicName,
          dentistName: order.dentist.dentistName,
        },
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        priority: order.priority,
        displayLabel: `${order.orderNumber} - ${order.dentist.clinicName} - ${order.patientName || 'No patient'}${suffix}`,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    console.error('GET /api/orders/available-for-worksheet error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
