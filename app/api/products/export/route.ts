/**
 * Product Export API
 * GET /api/products/export
 *
 * Exports all products to CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Escape CSV field value
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const category = searchParams.get('category');

    // Build query
    const where: any = {};

    if (activeOnly) {
      where.active = true;
    }

    if (category) {
      where.category = category;
    }

    // Fetch products
    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { code: 'asc' },
      ],
      select: {
        code: true,
        name: true,
        description: true,
        category: true,
        currentPrice: true,
        unit: true,
        active: true,
      },
    });

    // Build CSV content
    const headers = ['Code', 'Name', 'Description', 'Category', 'Price', 'Unit', 'Active'];
    const csvRows = [headers.join(',')];

    for (const product of products) {
      const row = [
        escapeCsvField(product.code),
        escapeCsvField(product.name),
        escapeCsvField(product.description),
        escapeCsvField(product.category),
        product.currentPrice.toString(),
        escapeCsvField(product.unit),
        product.active ? 'Yes' : 'No',
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `products-export-${date}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
