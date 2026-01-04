// Material Low Stock Alerts API
// GET: Materials below quantity threshold (for dashboard widget)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLowStockMaterials } from '@/lib/services/material-service';

/**
 * GET /api/materials/alerts/low-stock
 * Get materials below quantity threshold
 * Query params:
 * - threshold: number (default: 20)
 *
 * Returns materials sorted by percentage of threshold (lowest first)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const threshold = parseInt(searchParams.get('threshold') || '20', 10);

    // Validate threshold
    if (isNaN(threshold) || threshold < 1) {
      return NextResponse.json(
        { error: 'threshold must be a positive number' },
        { status: 400 }
      );
    }

    // Get low stock materials
    const alerts = await getLowStockMaterials(threshold);

    // Categorize by severity based on percentage
    const critical = alerts.filter((a) => a.percentageOfThreshold < 25); // <25%
    const warning = alerts.filter((a) => a.percentageOfThreshold >= 25 && a.percentageOfThreshold < 50); // 25-50%
    const info = alerts.filter((a) => a.percentageOfThreshold >= 50); // 50-100%

    return NextResponse.json({
      alerts,
      grouped: {
        critical,
        warning,
        info,
      },
      summary: {
        total: alerts.length,
        critical: critical.length,
        warning: warning.length,
        info: info.length,
      },
    });
  } catch (error) {
    console.error('GET /api/materials/alerts/low-stock error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch low stock alerts' },
      { status: 500 }
    );
  }
}
