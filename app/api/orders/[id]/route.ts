/**
 * Single Order API Route
 *
 * GET    /api/orders/[id] - Get order details
 * PATCH  /api/orders/[id] - Update order
 * DELETE /api/orders/[id] - Soft delete order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getOrderById,
  updateOrder,
  deleteOrder,
} from '@/lib/services/order-service';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for updating orders
const updateOrderSchema = z.object({
  dentistId: z.string().optional(),
  patientName: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(OrderStatus).optional(),
  priority: z.number().int().min(0).max(2).optional(),
  impressionType: z.enum(['PHYSICAL_IMPRINT', 'DIGITAL_SCAN']).optional(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/orders/[id]
 * Get single order with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role permissions
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    const { id } = await params;
    // Update order
    const order = await updateOrder(id, validatedData, session.user.id);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);

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

    // Not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
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
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * Soft delete order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role - ADMIN and TECHNICIAN can delete orders
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions to delete orders' },
        { status: 403 }
      );
    }

    const { id } = await params;
    // Soft delete order
    await deleteOrder(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);

    // Not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Business logic error (e.g., has worksheet)
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
