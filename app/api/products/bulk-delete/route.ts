/**
 * Products API - Bulk Delete
 *
 * POST /api/products/bulk-delete - Delete multiple products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { productService } from '@/lib/services/product-service';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one product ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can bulk delete
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = bulkDeleteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await productService.bulkDelete(
      validationResult.data.ids,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} products`,
    });
  } catch (error: any) {
    console.error('Failed to bulk delete products:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to delete products' },
      { status: 500 }
    );
  }
}
