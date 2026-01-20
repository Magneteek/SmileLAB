import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Simple database-only duplicate check
 * Used as FALLBACK when AI smart-scan fails (429/529 errors)
 *
 * Does case-insensitive fuzzy matching on name and manufacturer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, manufacturer } = body;

    if (!name && !manufacturer) {
      return NextResponse.json({
        success: true,
        materialExists: false,
        matchedMaterial: null,
        message: 'No search criteria provided',
      });
    }

    // Build search conditions - case-insensitive contains match
    const conditions: any[] = [];

    if (name) {
      // Clean and normalize the name for matching
      const cleanName = name.trim().toLowerCase();
      conditions.push({
        name: {
          contains: cleanName,
          mode: 'insensitive',
        },
      });
    }

    if (manufacturer) {
      // Clean and normalize manufacturer
      const cleanManufacturer = manufacturer.trim().toLowerCase();
      conditions.push({
        manufacturer: {
          contains: cleanManufacturer,
          mode: 'insensitive',
        },
      });
    }

    // Search for materials matching ANY condition (OR logic for broader matching)
    // Then filter for materials matching BOTH if both are provided
    let materials = await prisma.material.findMany({
      where: {
        AND: conditions,
      },
      select: {
        id: true,
        code: true,
        name: true,
        manufacturer: true,
        type: true,
        unit: true,
      },
      take: 5,
    });

    // If no exact match, try broader search with OR
    if (materials.length === 0 && name && manufacturer) {
      materials = await prisma.material.findMany({
        where: {
          OR: conditions,
        },
        select: {
          id: true,
          code: true,
          name: true,
          manufacturer: true,
          type: true,
          unit: true,
        },
        take: 5,
      });
    }

    if (materials.length > 0) {
      // Calculate simple match scores based on string similarity
      const scoredMaterials = materials.map((material) => {
        let score = 0;

        // Name matching
        if (name) {
          const nameMatch = material.name.toLowerCase().includes(name.toLowerCase());
          const exactNameMatch = material.name.toLowerCase() === name.toLowerCase();
          if (exactNameMatch) score += 50;
          else if (nameMatch) score += 30;
        }

        // Manufacturer matching
        if (manufacturer) {
          const manuMatch = material.manufacturer?.toLowerCase().includes(manufacturer.toLowerCase());
          const exactManuMatch = material.manufacturer?.toLowerCase() === manufacturer.toLowerCase();
          if (exactManuMatch) score += 50;
          else if (manuMatch) score += 30;
        }

        return { ...material, matchScore: score };
      });

      // Sort by score and return the best match
      scoredMaterials.sort((a, b) => b.matchScore - a.matchScore);
      const bestMatch = scoredMaterials[0];

      return NextResponse.json({
        success: true,
        materialExists: true,
        matchedMaterial: {
          id: bestMatch.id,
          code: bestMatch.code,
          name: bestMatch.name,
          manufacturer: bestMatch.manufacturer || '',
          type: bestMatch.type,
          unit: bestMatch.unit,
        },
        matchScore: bestMatch.matchScore,
        confidence: bestMatch.matchScore >= 80 ? 'high' : bestMatch.matchScore >= 50 ? 'medium' : 'low',
        reasoning: `Database match found: "${bestMatch.name}" by ${bestMatch.manufacturer}`,
        isFallback: true, // Flag to indicate this is a fallback check
      });
    }

    return NextResponse.json({
      success: true,
      materialExists: false,
      matchedMaterial: null,
      isFallback: true,
    });

  } catch (error) {
    console.error('Error in duplicate check:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
