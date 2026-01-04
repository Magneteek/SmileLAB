/**
 * Dentists API Routes
 * GET /api/dentists - List dentists with filtering
 * POST /api/dentists - Create new dentist
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDentists,
  createDentist,
  getActiveDentists,
} from '@/lib/services/dentist-service';
import { z } from 'zod';

// ============================================================================
// GET /api/dentists
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for simple mode (for dropdowns)
    const searchParams = request.nextUrl.searchParams;
    const simple = searchParams.get('simple') === 'true';

    if (simple) {
      // Return simplified list of active dentists for dropdowns
      const dentists = await getActiveDentists();
      return NextResponse.json({
        success: true,
        data: dentists,
      });
    }

    // Parse query parameters for full list
    const activeParam = searchParams.get('active');
    const city = searchParams.get('city') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = (searchParams.get('sortBy') as any) || 'clinicName';
    const sortOrder =
      (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

    // Parse active filter
    let active: boolean | undefined;
    if (activeParam === 'true') active = true;
    if (activeParam === 'false') active = false;

    const result = await getDentists({
      active,
      city,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      dentists: result.dentists,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('GET /api/dentists error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/dentists
// ============================================================================

const createDentistSchema = z.object({
  clinicName: z.string().min(1, 'Clinic name is required').max(200),
  dentistName: z.string().min(1, 'Dentist name is required').max(200),
  licenseNumber: z.string().max(100).optional(),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number is required').max(50),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  businessRegistration: z.string().max(100).optional(),
  paymentTerms: z.number().int().min(1).max(365).optional(),
  requiresInvoicing: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate input
    const validationResult = createDentistSchema.safeParse(body);
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

    // Create dentist
    const dentist = await createDentist(data, session.user.id);

    return NextResponse.json(dentist, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/dentists error:', error);

    if (error.message?.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
