/**
 * Orders API Route
 *
 * GET  /api/orders - List orders with filtering and pagination
 * POST /api/orders - Create new order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getOrders,
  createOrder,
} from '@/lib/services/order-service';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for creating orders
const createOrderSchema = z.object({
  dentistId: z.string().min(1, 'Dentist is required'),
  patientName: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(0).max(2).optional(),
  impressionType: z.enum(['PHYSICAL_IMPRINT', 'DIGITAL_SCAN']).optional(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/orders
 * List orders with filters
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      status: searchParams.get('status') as OrderStatus | undefined,
      dentistId: searchParams.get('dentistId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      priority: searchParams.get('priority')
        ? parseInt(searchParams.get('priority')!, 10)
        : undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!, 10)
        : 1,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
      sortBy: (searchParams.get('sortBy') as
        | 'orderDate'
        | 'dueDate'
        | 'orderNumber'
        | 'status'
        | undefined) || 'orderDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc' | undefined) ||
        'desc',
      // Hide INVOICED orders from TECHNICIAN role
      excludeStatus: session.user.role === 'TECHNICIAN' ? 'INVOICED' as OrderStatus : undefined,
    };

    const result = await getOrders(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create new order
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role - only ADMIN and TECHNICIAN can create orders
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Create order
    const order = await createOrder(validatedData, session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/orders error:', error);

    // Validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Business logic error
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
