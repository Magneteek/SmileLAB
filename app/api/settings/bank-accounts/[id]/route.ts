/**
 * Bank Account by ID API Route
 *
 * PATCH: Update bank account
 * DELETE: Delete bank account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateBankAccount,
  deleteBankAccount,
} from '@/lib/services/lab-configuration-service';
import type { UpdateBankAccountDto } from '@/types/lab-configuration';

/**
 * PATCH /api/settings/bank-accounts/[id]
 * Update bank account
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can update bank accounts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: UpdateBankAccountDto = {
      bankName: body.bankName,
      iban: body.iban,
      swiftBic: body.swiftBic,
      accountType: body.accountType,
      isActive: body.isActive,
      isPrimary: body.isPrimary,
      displayOrder: body.displayOrder,
      notes: body.notes,
    };

    const account = await updateBankAccount(id, data);

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Failed to update bank account:', error);

    // Handle specific error cases
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/bank-accounts/[id]
 * Delete bank account
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete bank accounts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await deleteBankAccount(id);

    return NextResponse.json(
      { success: true, message: 'Bank account deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to delete bank account:', error);

    // Handle specific error cases
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete bank account' },
      { status: 500 }
    );
  }
}
