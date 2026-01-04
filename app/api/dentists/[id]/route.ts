/**
 * Dentist Detail API Routes
 * GET /api/dentists/[id] - Get dentist by ID
 * PATCH /api/dentists/[id] - Update dentist
 * DELETE /api/dentists/[id] - Soft delete dentist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDentistById,
  updateDentist,
  deleteDentist,
  getDentistStats,
} from '@/lib/services/dentist-service';
import { z } from 'zod';

// ============================================================================
// GET /api/dentists/[id]
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

    // Check for stats request
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('stats') === 'true';

    if (includeStats) {
      const stats = await getDentistStats(id);

      if (!stats) {
        return NextResponse.json(
          { error: 'Dentist not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(stats);
    }

    // Regular dentist fetch
    const dentist = await getDentistById(id, true);

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 });
    }

    return NextResponse.json(dentist);
  } catch (error) {
    console.error('GET /api/dentists/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/dentists/[id]
// ============================================================================

const updateDentistSchema = z.object({
  clinicName: z.string().min(1).max(200).optional(),
  dentistName: z.string().min(1).max(200).optional(),
  licenseNumber: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(1).max(50).optional(),
  address: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  country: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  businessRegistration: z.string().max(100).optional(),
  paymentTerms: z.number().int().min(1).max(365).optional(),
  requiresInvoicing: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is ADMIN or TECHNICIAN
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN or TECHNICIAN role required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = updateDentistSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Update dentist
    const dentist = await updateDentist(id, data, session.user.id);

    return NextResponse.json(dentist);
  } catch (error: any) {
    console.error('PATCH /api/dentists/[id] error:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message?.includes('already in use')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/dentists/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete dentists
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN role required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Soft delete dentist
    await deleteDentist(id, session.user.id);

    return NextResponse.json({ success: true, message: 'Dentist deleted' });
  } catch (error: any) {
    console.error('DELETE /api/dentists/[id] error:', error);

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message?.includes('active order') ||
      error.message?.includes('active worksheet')
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
