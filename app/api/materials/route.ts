// Material Management API Routes
// GET: List materials with filtering
// POST: Create new material

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getMaterials,
  createMaterial,
  getAvailableMaterials,
} from '@/lib/services/material-service';
import { CreateMaterialDto, MaterialFilters } from '@/types/material';
import { MaterialType } from '@prisma/client';

/**
 * GET /api/materials
 * List materials with optional filtering
 * Query params:
 * - type: MaterialType
 * - active: boolean
 * - search: string
 * - hasStock: boolean (only materials with available LOTs)
 * - biocompatible: boolean
 * - ceMarked: boolean
 * - available: boolean (use available materials endpoint)
 * - page: number
 * - pageSize: number
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
    const useAvailableEndpoint = searchParams.get('available') === 'true';

    // If requesting available materials only, use specialized endpoint
    if (useAvailableEndpoint) {
      const availableMaterials = await getAvailableMaterials();
      return NextResponse.json({
        data: availableMaterials,
        count: availableMaterials.length,
      });
    }

    // Build filters
    const filters: MaterialFilters = {};

    const type = searchParams.get('type');
    if (type && Object.values(MaterialType).includes(type as MaterialType)) {
      filters.type = type as MaterialType;
    }

    const active = searchParams.get('active');
    if (active !== null) {
      filters.active = active === 'true';
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const hasStock = searchParams.get('hasStock');
    if (hasStock !== null) {
      filters.hasStock = hasStock === 'true';
    }

    const biocompatible = searchParams.get('biocompatible');
    if (biocompatible !== null) {
      filters.biocompatible = biocompatible === 'true';
    }

    const ceMarked = searchParams.get('ceMarked');
    if (ceMarked !== null) {
      filters.ceMarked = ceMarked === 'true';
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // Get materials
    const result = await getMaterials(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/materials error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials
 * Create new material
 * Auth: ADMIN, TECHNICIAN
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role (ADMIN or TECHNICIAN can create materials)
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN or TECHNICIAN role required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.code || !body.name || !body.type || !body.manufacturer) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, type, manufacturer' },
        { status: 400 }
      );
    }

    // Validate material type
    if (!Object.values(MaterialType).includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid material type. Must be one of: ${Object.values(MaterialType).join(', ')}` },
        { status: 400 }
      );
    }

    // Build DTO
    const dto: CreateMaterialDto = {
      code: body.code.trim(),
      name: body.name.trim(),
      type: body.type as MaterialType,
      manufacturer: body.manufacturer.trim(),
      description: body.description?.trim(),
      biocompatible: body.biocompatible ?? true,
      iso10993Cert: body.iso10993Cert?.trim(),
      ceMarked: body.ceMarked ?? true,
      ceNumber: body.ceNumber?.trim(),
      unit: body.unit || 'gram',
      active: body.active ?? true,
    };

    // Create material
    const material = await createMaterial(dto, session.user.id);

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('POST /api/materials error:', error);

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    );
  }
}
