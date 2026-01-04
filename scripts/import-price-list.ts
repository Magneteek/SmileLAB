/**
 * Price List Import Script
 *
 * Imports products from Cenik Zunanji 2025.csv
 * Run with: npx tsx scripts/import-price-list.ts
 */

import { PrismaClient, ProductCategory } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Category mapping based on CSV sections
const categoryMap: Record<string, ProductCategory> = {
  // FIKSNA PROTETIKA (Fixed Prosthetics)
  'akrilna funkcijska žlica': ProductCategory.TEMPLATE,
  'akrilna grizna šablona': ProductCategory.TEMPLATE,
  'Bredent polzilo + montaža za 1 element': ProductCategory.BRIDGE,
  'frezanje ložev v pripravi za Wizil prot.': ProductCategory.SERVICE,
  'izdelava provizorija laboratorijsko, po zobu': ProductCategory.PROVISIONAL,
  'izdelava provizorija PMMA CAD-CAM, po zobu': ProductCategory.PROVISIONAL,
  'keramična faseta': ProductCategory.VENEER,
  'keramični inlay (PRESS, E-MAX, GC)': ProductCategory.INLAY,
  'kovinsko keramična prevleka': ProductCategory.CROWN,
  'navosek, po zobu': ProductCategory.SERVICE,
  'nočni ščitnik za bruksiste, mehka folija': ProductCategory.SPLINT,
  'omavčevanje v artikulator z obraznim lokom': ProductCategory.SERVICE,
  'zirkonij monolit': ProductCategory.CROWN,
  'zirkonij monolit + plastenje (E-MAX)': ProductCategory.CROWN,
  'reparatura mostička': ProductCategory.REPAIR,
  'shulter keramika gingivalno': ProductCategory.SERVICE,
  'športni / bruksistični ščitnik': ProductCategory.SPLINT,
  'žlica za beljenje': ProductCategory.TEMPLATE,
  'akrilna bruksistična trda opornica - Michigenska': ProductCategory.SPLINT,
  'izdelava študijskega modela': ProductCategory.MODEL,
  'hibridna keramika (prevleke,inlay,luske)': ProductCategory.CROWN,

  // IMPLANTOLOGIJA (Implantology)
  'akrilna žlica za implantate (za odtis implantata)': ProductCategory.TEMPLATE,
  'dodatek na abatmant (pri synconu) locator': ProductCategory.ABUTMENT,
  'gingivalna maska 1-3 zob': ProductCategory.SERVICE,
  'gingivalna maska 3-10 zob': ProductCategory.SERVICE,
  'kovinsko keramična prevleka na konfekcijskem abutmentu': ProductCategory.CROWN,
  'prenosni fiksator iz akrilata - ključek': ProductCategory.TEMPLATE,
  'svetovalna ura (60min) , pomoč v ordinaciji': ProductCategory.SERVICE,
  'šablona za načrtovanje implantata za rentgen - scan proteza': ProductCategory.TEMPLATE,
  'zirkon - monolit prevleka na abutmentu': ProductCategory.CROWN,
  'implantološko podprta totalna proteza': ProductCategory.DENTURE,
  'abutment individual. narejen CAD-CAM Atlantis.. (cena od €200 naprej)': ProductCategory.ABUTMENT,
  'dodatek na abutmant (izbira abumantov)': ProductCategory.ABUTMENT,

  // SNEMNA PROTETIKA (Removable Prosthetics)
  // Note: 'akrilna funkcijska žlica' already mapped above
  'faseta akrilna v Wizil protezi': ProductCategory.VENEER,
  'grizni robnik na Wizil bazi': ProductCategory.SERVICE,
  'imediatna proteza': ProductCategory.DENTURE,
  'izgotovitev Wizil proteze': ProductCategory.DENTURE,
  'konus prevleka (primarna + sekundarna) + kovina': ProductCategory.CROWN,
  'parcialna proteza s kovinskimi zaponami': ProductCategory.DENTURE,
  'podložitev totalne proteze': ProductCategory.REPAIR,
  'podložitev Wizil proteze': ProductCategory.REPAIR,
  'reparatura proteze osnova, + vsak element 6 €': ProductCategory.REPAIR,
  'totalna proteza + kompozitni nadstandardni zobi doplačilo': ProductCategory.DENTURE,
  'čiščenje in poliranje proteze': ProductCategory.SERVICE,
  'Wizil kovinska baza, enostavna': ProductCategory.DENTURE,
  'Wizil kovinska baza, z lotanjem': ProductCategory.DENTURE,
  'Wizil ogrodje za implantate - mrežica': ProductCategory.DENTURE,
  'Wizil kovinska baza - printana 3D': ProductCategory.DENTURE,
  'Valplast proteza': ProductCategory.DENTURE,
  'izdelava provizorija na trdo folijo': ProductCategory.PROVISIONAL,
};

interface PriceListItem {
  itemNumber: string;
  name: string;
  price: number;
  category: ProductCategory;
}

function parsePrice(priceStr: string): number {
  // Remove € symbol and convert to number
  return parseFloat(priceStr.replace('€', '').replace(',', '.'));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function getCategory(productName: string): ProductCategory {
  // Try exact match first
  if (categoryMap[productName]) {
    return categoryMap[productName];
  }

  // Default to OTHER if no match found
  console.warn(`⚠️  No category mapping for: ${productName}, using OTHER`);
  return ProductCategory.OTHER;
}

async function importPriceList(csvPath: string) {
  console.log('📋 Reading CSV file...\n');

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');

  const products: PriceListItem[] = [];

  for (const line of lines) {
    const columns = parseCsvLine(line);

    // Skip empty lines and header lines
    if (columns.length < 4) continue;
    if (!columns[1] || !columns[2] || !columns[3]) continue;

    const itemNumber = columns[1].trim();
    const name = columns[2].trim();
    const priceStr = columns[3].trim();

    // Skip if not a valid item (check if itemNumber is a number)
    if (!/^\d+$/.test(itemNumber)) continue;

    // Skip if no price
    if (!priceStr.startsWith('€')) continue;

    const price = parsePrice(priceStr);
    const category = getCategory(name);

    products.push({
      itemNumber,
      name,
      price,
      category,
    });
  }

  console.log(`✅ Parsed ${products.length} products from CSV\n`);

  // Import products into database
  console.log('💾 Importing products into database...\n');

  let created = 0;
  let updated = 0;

  for (const product of products) {
    const code = `PRD-${product.itemNumber.padStart(3, '0')}`;

    try {
      // Check if product already exists
      const existing = await prisma.product.findUnique({
        where: { code },
      });

      if (existing) {
        // Update existing product
        await prisma.product.update({
          where: { code },
          data: {
            name: product.name,
            category: product.category,
            currentPrice: product.price,
            unit: 'KOS', // Default unit
            active: true,
          },
        });

        // Add price history entry if price changed
        if (existing.currentPrice !== product.price) {
          await prisma.productPriceHistory.create({
            data: {
              productId: existing.id,
              price: product.price,
              effectiveFrom: new Date(),
              reason: 'Updated from Cenik Zunanji 2025 import',
            },
          });
        }

        updated++;
        console.log(`♻️  Updated: ${code} - ${product.name}`);
      } else {
        // Create new product
        const newProduct = await prisma.product.create({
          data: {
            code,
            name: product.name,
            category: product.category,
            currentPrice: product.price,
            unit: 'KOS', // Default unit
            active: true,
          },
        });

        // Create initial price history entry
        await prisma.productPriceHistory.create({
          data: {
            productId: newProduct.id,
            price: product.price,
            effectiveFrom: new Date(),
            reason: 'Initial price from Cenik Zunanji 2025 import',
          },
        });

        created++;
        console.log(`✨ Created: ${code} - ${product.name} (€${product.price.toFixed(2)})`);
      }
    } catch (error) {
      console.error(`❌ Failed to import ${code}:`, error);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   Created: ${created} products`);
  console.log(`   Updated: ${updated} products`);
  console.log(`   Total:   ${created + updated} products\n`);
}

async function main() {
  try {
    const csvPath = '/Users/kris/Downloads/Cenik Zunanji 2025.csv';

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ File not found: ${csvPath}`);
      process.exit(1);
    }

    await importPriceList(csvPath);

    console.log('✅ Price list import completed successfully!\n');
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
