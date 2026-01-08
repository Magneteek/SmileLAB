/**
 * Product Code Generation API
 * GET /api/products/generate-code?category=CROWN
 * Returns the next auto-generated code for the given product category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateProductCode } from '@/lib/services/pricing-service';
import { ProductCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get category from query params
    const category = request.nextUrl.searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { error: 'Product category is required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(ProductCategory).includes(category as ProductCategory)) {
      return NextResponse.json(
        { error: `Invalid product category: ${category}` },
        { status: 400 }
      );
    }

    // Generate code
    const code = await generateProductCode(category);

    return NextResponse.json({ code });
  } catch (error) {
    console.error('GET /api/products/generate-code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}
