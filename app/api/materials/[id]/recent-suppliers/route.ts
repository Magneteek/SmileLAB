import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/materials/[id]/recent-suppliers
 *
 * Get list of recent suppliers for a specific material
 * Used for supplier autocomplete in LOT entry forms
 *
 * Returns: { suppliers: string[] }
 */
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

    // Fetch recent unique suppliers for this material
    // Get up to 10 most recent suppliers ordered by last usage
    const recentLots = await prisma.materialLot.findMany({
      where: {
        materialId: id,
      },
      select: {
        supplierName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Get more to filter unique
    });

    // Extract unique supplier names preserving order
    const uniqueSuppliers: string[] = [];
    const seen = new Set<string>();

    for (const lot of recentLots) {
      if (lot.supplierName && !seen.has(lot.supplierName)) {
        uniqueSuppliers.push(lot.supplierName);
        seen.add(lot.supplierName);
      }

      // Limit to 10 unique suppliers
      if (uniqueSuppliers.length >= 10) {
        break;
      }
    }

    return NextResponse.json({ suppliers: uniqueSuppliers });
  } catch (error) {
    console.error('Error fetching recent suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent suppliers' },
      { status: 500 }
    );
  }
}
