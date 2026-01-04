/**
 * Bank Accounts API Route
 *
 * POST: Add new bank account to lab configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addBankAccount } from '@/lib/services/lab-configuration-service';
import type { CreateBankAccountDto } from '@/types/lab-configuration';

/**
 * POST /api/settings/bank-accounts
 * Add new bank account to lab configuration
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can add bank accounts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = ['bankName', 'iban'];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }

    const data: CreateBankAccountDto = {
      bankName: body.bankName,
      iban: body.iban,
      swiftBic: body.swiftBic,
      accountType: body.accountType,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isPrimary: body.isPrimary || false,
      displayOrder: body.displayOrder,
      notes: body.notes,
    };

    const account = await addBankAccount(data, session.user.id);

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add bank account:', error);

    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Lab configuration not found. Please create lab configuration first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add bank account' },
      { status: 500 }
    );
  }
}
