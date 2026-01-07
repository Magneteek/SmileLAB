/**
 * Products API - Bulk Update
 *
 * POST /api/products/bulk-update - Update multiple products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { productService } from '@/lib/services/product-service';
import { ProductCategory } from '@prisma/client';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one product ID is required'),
  data: z.object({
    active: z.boolean().optional(),
    category: z.nativeEnum(ProductCategory).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[API] bulk-update POST request received');

    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('[API] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can bulk update
    if (session.user.role !== 'ADMIN') {
      console.log('[API] User role not ADMIN:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('[API] Request body:', body);

    // Validate request body
    const validationResult = bulkUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('[API] Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    console.log('[API] Validation passed, calling service');
    const result = await productService.bulkUpdate(
      validationResult.data.ids,
      validationResult.data.data,
      session.user.id
    );

    console.log('[API] Service call successful:', result);
    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully updated ${result.count} products`,
    });
  } catch (error: any) {
    console.error('[API] Failed to bulk update products:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to update products' },
      { status: 500 }
    );
  }
}
