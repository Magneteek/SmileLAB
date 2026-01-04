// Material Expiry Alerts API
// GET: Materials expiring within specified days (for dashboard widget)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getExpiringMaterials } from '@/lib/services/material-service';

/**
 * GET /api/materials/alerts/expiring
 * Get materials expiring within specified days
 * Query params:
 * - days: number (default: 30)
 *
 * Returns alerts with severity levels:
 * - critical: <7 days
 * - warning: 7-30 days
 * - info: >30 days
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
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Validate days
    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'days must be a positive number' },
        { status: 400 }
      );
    }

    // Get expiring materials
    const alerts = await getExpiringMaterials(days);

    // Group by severity
    const grouped = {
      critical: alerts.filter((a) => a.severity === 'critical'),
      warning: alerts.filter((a) => a.severity === 'warning'),
      info: alerts.filter((a) => a.severity === 'info'),
    };

    return NextResponse.json({
      alerts,
      grouped,
      summary: {
        total: alerts.length,
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length,
      },
    });
  } catch (error) {
    console.error('GET /api/materials/alerts/expiring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiry alerts' },
      { status: 500 }
    );
  }
}
