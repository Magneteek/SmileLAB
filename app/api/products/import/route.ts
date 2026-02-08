/**
 * Product Import API
 * POST /api/products/import
 *
 * Imports products from CSV file with auto-code generation if code is empty
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProductCategory } from '@prisma/client';

// Category code prefixes for auto-generation
const CATEGORY_PREFIXES: Record<ProductCategory, string> = {
  FIKSNA_PROTETIKA: 'FIX',
  SNEMNA_PROTETIKA: 'SNM',
  IMPLANTOLOGIJA: 'IMP',
  ESTETIKA: 'EST',
  OSTALO: 'OST',
};

interface CsvRow {
  code?: string;
  name: string;
  description?: string;
  category: string;
  price: string;
  unit?: string;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  products: Array<{
    code: string;
    name: string;
    status: 'created' | 'updated' | 'error';
    error?: string;
  }>;
}

/**
 * Generate auto-code for a product based on category
 */
async function generateProductCode(category: ProductCategory): Promise<string> {
  const prefix = CATEGORY_PREFIXES[category] || 'PRD';

  // Find the highest existing code number for this category prefix
  const existing = await prisma.product.findMany({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 1,
  });

  let nextNumber = 1;

  if (existing.length > 0) {
    // Extract number from existing code (e.g., "CRW-042" -> 42)
    const match = existing[0].code.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Parse category string to ProductCategory enum
 */
function parseCategory(categoryStr: string): ProductCategory {
  const normalized = categoryStr.toUpperCase().trim();

  // Direct match
  if (normalized in ProductCategory) {
    return normalized as ProductCategory;
  }

  // Common mappings to new simplified categories
  const mappings: Record<string, ProductCategory> = {
    // FIKSNA_PROTETIKA (Fixed Prosthetics)
    'KRONA': ProductCategory.FIKSNA_PROTETIKA,
    'CROWN': ProductCategory.FIKSNA_PROTETIKA,
    'KRONSKA': ProductCategory.FIKSNA_PROTETIKA,
    'PREVLEKA': ProductCategory.FIKSNA_PROTETIKA,
    'MOST': ProductCategory.FIKSNA_PROTETIKA,
    'BRIDGE': ProductCategory.FIKSNA_PROTETIKA,
    'MOSTIČEK': ProductCategory.FIKSNA_PROTETIKA,
    'ZALIVKA': ProductCategory.FIKSNA_PROTETIKA,
    'FILLING': ProductCategory.FIKSNA_PROTETIKA,
    'INLAY': ProductCategory.FIKSNA_PROTETIKA,
    'ONLAY': ProductCategory.FIKSNA_PROTETIKA,
    'PROVIZORIJ': ProductCategory.FIKSNA_PROTETIKA,
    'PROVISIONAL': ProductCategory.FIKSNA_PROTETIKA,

    // SNEMNA_PROTETIKA (Removable Prosthetics)
    'PROTEZA': ProductCategory.SNEMNA_PROTETIKA,
    'DENTURE': ProductCategory.SNEMNA_PROTETIKA,

    // IMPLANTOLOGIJA (Implantology)
    'IMPLANTAT': ProductCategory.IMPLANTOLOGIJA,
    'IMPLANT': ProductCategory.IMPLANTOLOGIJA,
    'ABUTMENT': ProductCategory.IMPLANTOLOGIJA,

    // ESTETIKA (Aesthetics)
    'LUSKA': ProductCategory.ESTETIKA,
    'FASETA': ProductCategory.ESTETIKA,
    'VENEER': ProductCategory.ESTETIKA,

    // OSTALO (Other)
    'OPORNICA': ProductCategory.OSTALO,
    'ŠČITNIK': ProductCategory.OSTALO,
    'SPLINT': ProductCategory.OSTALO,
    'ŠABLONA': ProductCategory.OSTALO,
    'ŽLICA': ProductCategory.OSTALO,
    'TEMPLATE': ProductCategory.OSTALO,
    'STORITEV': ProductCategory.OSTALO,
    'SERVICE': ProductCategory.OSTALO,
    'SERVIS': ProductCategory.OSTALO,
    'REPARATURA': ProductCategory.OSTALO,
    'REPAIR': ProductCategory.OSTALO,
    'POPRAVILO': ProductCategory.OSTALO,
    'MODEL': ProductCategory.OSTALO,
    'ORTODONTIJA': ProductCategory.OSTALO,
    'ORTHODONTICS': ProductCategory.OSTALO,
    'DRUGO': ProductCategory.OSTALO,
    'OTHER': ProductCategory.OSTALO,
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return ProductCategory.OSTALO;
}

/**
 * Parse CSV content into rows
 */
function parseCsv(content: string): CsvRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header line
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().trim());

  // Map header indices
  const codeIdx = headers.findIndex(h => h === 'code' || h === 'koda' || h === 'šifra');
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'naziv' || h === 'ime');
  const descIdx = headers.findIndex(h => h === 'description' || h === 'opis');
  const categoryIdx = headers.findIndex(h => h === 'category' || h === 'kategorija');
  const priceIdx = headers.findIndex(h => h === 'price' || h === 'cena');
  const unitIdx = headers.findIndex(h => h === 'unit' || h === 'enota');

  if (nameIdx === -1) {
    throw new Error('CSV must have a "name" or "naziv" column');
  }
  if (priceIdx === -1) {
    throw new Error('CSV must have a "price" or "cena" column');
  }

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = parseCsvLine(lines[i]);

    if (columns.length === 0) continue;

    const name = columns[nameIdx]?.trim();
    const price = columns[priceIdx]?.trim();

    if (!name || !price) continue;

    rows.push({
      code: codeIdx >= 0 ? columns[codeIdx]?.trim() : undefined,
      name,
      description: descIdx >= 0 ? columns[descIdx]?.trim() : undefined,
      category: categoryIdx >= 0 ? columns[categoryIdx]?.trim() || 'OTHER' : 'OTHER',
      price,
      unit: unitIdx >= 0 ? columns[unitIdx]?.trim() : undefined,
    });
  }

  return rows;
}

/**
 * Parse a single CSV line handling quotes
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr: string): number {
  // Remove currency symbols and normalize
  const cleaned = priceStr
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');

  const price = parseFloat(cleaned);

  if (isNaN(price)) {
    throw new Error(`Invalid price: ${priceStr}`);
  }

  return price;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can import products
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get form data with CSV file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file content
    const content = await file.text();

    // Parse CSV
    let rows: CsvRow[];
    try {
      rows = parseCsv(content);
    } catch (error) {
      return NextResponse.json({
        error: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid data rows in CSV' }, { status: 400 });
    }

    // Import products
    const result: ImportResult = {
      success: true,
      created: 0,
      updated: 0,
      errors: [],
      products: [],
    };

    for (const row of rows) {
      try {
        const category = parseCategory(row.category);
        const price = parsePrice(row.price);

        // Generate code if not provided
        let code = row.code;
        if (!code || code.trim() === '') {
          code = await generateProductCode(category);
        }

        // Check if product exists (by code)
        const existing = await prisma.product.findUnique({
          where: { code },
        });

        if (existing) {
          // Update existing product
          await prisma.product.update({
            where: { code },
            data: {
              name: row.name,
              description: row.description || existing.description,
              category,
              currentPrice: price,
              unit: row.unit || existing.unit,
              active: true,
            },
          });

          // Add price history if price changed
          if (Number(existing.currentPrice) !== price) {
            await prisma.productPriceHistory.create({
              data: {
                productId: existing.id,
                price,
                effectiveFrom: new Date(),
                reason: 'Updated via CSV import',
              },
            });
          }

          result.updated++;
          result.products.push({
            code,
            name: row.name,
            status: 'updated',
          });
        } else {
          // Create new product
          const newProduct = await prisma.product.create({
            data: {
              code,
              name: row.name,
              description: row.description || null,
              category,
              currentPrice: price,
              unit: row.unit || 'KOS',
              active: true,
            },
          });

          // Create initial price history
          await prisma.productPriceHistory.create({
            data: {
              productId: newProduct.id,
              price,
              effectiveFrom: new Date(),
              reason: 'Initial import via CSV',
            },
          });

          result.created++;
          result.products.push({
            code,
            name: row.name,
            status: 'created',
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Row "${row.name}": ${errorMsg}`);
        result.products.push({
          code: row.code || 'N/A',
          name: row.name,
          status: 'error',
          error: errorMsg,
        });
      }
    }

    result.success = result.errors.length === 0;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
