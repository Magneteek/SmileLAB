/**
 * Products API Routes - Single Product Operations
 *
 * GET /api/products/[id] - Get single product
 * PUT /api/products/[id] - Update product
 * PATCH /api/products/[id] - Update product (partial)
 * DELETE /api/products/[id] - Delete product (hard delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { productService } from '@/lib/services/product-service';
import { ProductCategory } from '@prisma/client';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateProductSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  category: z.nativeEnum(ProductCategory, { errorMap: () => ({ message: 'Invalid category' }) }).optional(),
  currentPrice: z.number().positive('Price must be positive').optional(),
  unit: z.string().min(1).max(20).optional(),
  active: z.boolean().optional(),
});

// ============================================================================
// GET /api/products/[id] - Get single product
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const product = await productService.getById(id);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Failed to get product:', error);

    if (error.message === 'Product not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to get product' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/products/[id] - Update product
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permissions
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateProductSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const product = await productService.update(
      id,
      validationResult.data,
      session.user.id
    );

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Failed to update product:', error);

    if (error.message === 'Product not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/products/[id] - Update product (partial) - alias to PUT
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH is an alias to PUT for partial updates
  return PUT(request, { params });
}

// ============================================================================
// DELETE /api/products/[id] - Delete product (hard delete)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permissions (only ADMIN can delete products)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const product = await productService.delete(id, session.user.id);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Failed to delete product:', error);

    if (error.message === 'Product not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
