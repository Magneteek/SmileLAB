/**
 * Material Code Generation API
 * GET /api/materials/generate-code?type=CERAMIC
 * Returns the next auto-generated code for the given material type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMaterialCode } from '@/lib/services/material-service';
import { MaterialType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get type from query params
    const type = request.nextUrl.searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Material type is required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!Object.values(MaterialType).includes(type as MaterialType)) {
      return NextResponse.json(
        { error: `Invalid material type: ${type}` },
        { status: 400 }
      );
    }

    // Generate code
    const code = await generateMaterialCode(type);

    return NextResponse.json({ code });
  } catch (error) {
    console.error('GET /api/materials/generate-code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}
