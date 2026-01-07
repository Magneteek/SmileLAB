/**
 * Products API Routes - List and Create
 *
 * GET /api/products - List all products with filters
 * POST /api/products - Create new product
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

const createProductSchema = z.object({
  code: z.string().min(1, 'Product code is required').max(50),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(500).optional().nullable(),
  category: z.nativeEnum(ProductCategory, { message: 'Invalid category' }),
  currentPrice: z.number().positive('Price must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  active: z.boolean().optional(),
});

// ============================================================================
// GET /api/products - List all products
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const categoryParam = searchParams.get('category');
    const activeParam = searchParams.get('active');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await productService.list({
      search,
      category: categoryParam as ProductCategory | undefined,
      active: activeParam ? activeParam === 'true' : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to list products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list products' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/products - Create new product
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permissions (ADMIN or TECHNICIAN can create products)
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = createProductSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const product = await productService.create(
      validationResult.data,
      session.user.id
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create product:', error);

    if (error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
