/**
 * SOP Approval API
 *
 * POST /api/sops/[id]/approve - Approve an SOP
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sopService } from '@/lib/services/sop-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and QC can approve SOPs
    if (!['ADMIN', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or QC only' }, { status: 403 });
    }

    // Approve SOP
    const sop = await sopService.approveSOP(id, session.user.id);

    return NextResponse.json(sop);
  } catch (error: any) {
    console.error('Approve SOP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve SOP' },
      { status: 500 }
    );
  }
}
