/**
 * Dentist Orders API Route
 * GET /api/dentists/[id]/orders - Get all orders for a dentist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDentistOrders } from '@/lib/services/dentist-service';

// ============================================================================
// GET /api/dentists/[id]/orders
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getDentistOrders(id, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/dentists/[id]/orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
