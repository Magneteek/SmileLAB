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
    // 1. PENDING orders without worksheets (normal case)
    // 2. Orders with VOIDED worksheets regardless of status (revision case)
    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          // Case 1: PENDING orders (normal worksheet creation)
          { status: 'PENDING' },
          // Case 2: Orders with at least one VOIDED worksheet (revision worksheet)
          {
            worksheets: {
              some: {
                status: 'VOIDED',
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

    // Filter to only include orders that can actually have a new worksheet:
    // - Orders without any worksheets (normal case)
    // - Orders where the latest worksheet is VOIDED (revision case)
    const availableOrders = orders.filter((order: any) => {
      const latestWorksheet = order.worksheets[0];
      // No worksheet exists - can create new one
      if (!latestWorksheet) return true;
      // Latest worksheet is VOIDED - can create revision
      if (latestWorksheet.status === 'VOIDED') return true;
      // Has active worksheet - cannot create new one
      return false;
    });

    // Format for dropdown display
    const formattedOrders = availableOrders.map((order: any) => {
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
        displayLabel: `${order.orderNumber} - ${order.dentist.clinicName} - ${order.patientName || 'No patient'}`,
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
