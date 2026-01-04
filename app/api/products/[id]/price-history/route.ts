/**
 * Product Price History API Route
 * GET /api/products/:id/price-history - Get complete price history for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPriceHistory, getProductById } from '@/lib/services/pricing-service';

// ============================================================================
// GET /api/products/:id/price-history
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

    // Verify product exists
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get price history
    const history = await getPriceHistory(id);

    return NextResponse.json({
      productId: id,
      productCode: product.code,
      productName: product.name,
      currentPrice: parseFloat(product.currentPrice.toString()),
      history,
    });
  } catch (error) {
    console.error('GET /api/products/:id/price-history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
