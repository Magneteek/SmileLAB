/**
 * Laboratory Configuration API Route
 *
 * GET: Fetch current lab configuration with bank accounts
 * POST: Create initial lab configuration (admin only, singleton)
 * PATCH: Update lab configuration (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getLabConfiguration,
  createLabConfiguration,
  updateLabConfiguration,
} from '@/lib/services/lab-configuration-service';
import type {
  CreateLabConfigurationDto,
  UpdateLabConfigurationDto,
} from '@/types/lab-configuration';

/**
 * GET /api/settings/lab-configuration
 * Fetch current lab configuration with bank accounts
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getLabConfiguration();

    if (!config) {
      return NextResponse.json(
        { error: 'Lab configuration not found. Please create configuration first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch lab configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/lab-configuration
 * Create initial lab configuration (admin only, singleton)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can create lab configuration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      'laboratoryName',
      'street',
      'city',
      'postalCode',
      'phone',
      'email',
      'responsiblePersonName',
      'responsiblePersonTitle',
    ];

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

    const data: CreateLabConfigurationDto = {
      laboratoryName: body.laboratoryName,
      laboratoryId: body.laboratoryId,
      laboratoryLicense: body.laboratoryLicense,
      registrationNumber: body.registrationNumber,
      taxId: body.taxId,
      technicianIdNumber: body.technicianIdNumber,
      street: body.street,
      city: body.city,
      postalCode: body.postalCode,
      country: body.country || 'Slovenia',
      region: body.region,
      phone: body.phone,
      email: body.email,
      website: body.website,
      responsiblePersonName: body.responsiblePersonName,
      responsiblePersonTitle: body.responsiblePersonTitle,
      responsiblePersonLicense: body.responsiblePersonLicense,
      responsiblePersonEmail: body.responsiblePersonEmail,
      responsiblePersonPhone: body.responsiblePersonPhone,
      signaturePath: body.signaturePath,
      logoPath: body.logoPath,
      defaultPaymentTerms: body.defaultPaymentTerms,
      defaultTaxRate: body.defaultTaxRate,
      invoiceLegalTerms: body.invoiceLegalTerms,
    };

    const config = await createLabConfiguration(data, session.user.id);

    return NextResponse.json(config, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create lab configuration:', error);

    // Handle specific error cases
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Lab configuration already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create lab configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/lab-configuration
 * Update lab configuration (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can update lab configuration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const data: UpdateLabConfigurationDto = {
      laboratoryName: body.laboratoryName,
      laboratoryId: body.laboratoryId,
      laboratoryLicense: body.laboratoryLicense,
      registrationNumber: body.registrationNumber,
      taxId: body.taxId,
      technicianIdNumber: body.technicianIdNumber,
      street: body.street,
      city: body.city,
      postalCode: body.postalCode,
      country: body.country,
      region: body.region,
      phone: body.phone,
      email: body.email,
      website: body.website,
      responsiblePersonName: body.responsiblePersonName,
      responsiblePersonTitle: body.responsiblePersonTitle,
      responsiblePersonLicense: body.responsiblePersonLicense,
      responsiblePersonEmail: body.responsiblePersonEmail,
      responsiblePersonPhone: body.responsiblePersonPhone,
      signaturePath: body.signaturePath,
      logoPath: body.logoPath,
      defaultPaymentTerms: body.defaultPaymentTerms,
      defaultTaxRate: body.defaultTaxRate,
      invoiceLegalTerms: body.invoiceLegalTerms,
    };

    const config = await updateLabConfiguration(data, session.user.id);

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Failed to update lab configuration:', error);

    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Lab configuration not found. Please create it first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update lab configuration' },
      { status: 500 }
    );
  }
}
