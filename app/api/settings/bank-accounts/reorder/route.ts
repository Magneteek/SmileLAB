/**
 * Bank Accounts Reorder API Route
 *
 * POST: Reorder bank accounts for display
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reorderBankAccounts } from '@/lib/services/lab-configuration-service';

/**
 * POST /api/settings/bank-accounts/reorder
 * Reorder bank accounts for display on invoices
 *
 * Request body: { accountIds: string[] }
 * Array of account IDs in desired display order
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can reorder bank accounts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Validate request
    if (!body.accountIds || !Array.isArray(body.accountIds)) {
      return NextResponse.json(
        { error: 'accountIds must be an array of account IDs' },
        { status: 400 }
      );
    }

    if (body.accountIds.length === 0) {
      return NextResponse.json(
        { error: 'accountIds array cannot be empty' },
        { status: 400 }
      );
    }

    await reorderBankAccounts(body.accountIds);

    return NextResponse.json({
      success: true,
      message: 'Bank accounts reordered successfully',
    });
  } catch (error: any) {
    console.error('Failed to reorder bank accounts:', error);

    return NextResponse.json(
      { error: 'Failed to reorder bank accounts' },
      { status: 500 }
    );
  }
}
