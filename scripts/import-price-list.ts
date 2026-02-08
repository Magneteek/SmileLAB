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
  'akrilna funkcijska žlica': ProductCategory.OSTALO,
  'akrilna grizna šablona': ProductCategory.OSTALO,
  'Bredent polzilo + montaža za 1 element': ProductCategory.FIKSNA_PROTETIKA,
  'frezanje ložev v pripravi za Wizil prot.': ProductCategory.OSTALO,
  'izdelava provizorija laboratorijsko, po zobu': ProductCategory.FIKSNA_PROTETIKA,
  'izdelava provizorija PMMA CAD-CAM, po zobu': ProductCategory.FIKSNA_PROTETIKA,
  'keramična faseta': ProductCategory.ESTETIKA,
  'keramični inlay (PRESS, E-MAX, GC)': ProductCategory.FIKSNA_PROTETIKA,
  'kovinsko keramična prevleka': ProductCategory.FIKSNA_PROTETIKA,
  'navosek, po zobu': ProductCategory.OSTALO,
  'nočni ščitnik za bruksiste, mehka folija': ProductCategory.OSTALO,
  'omavčevanje v artikulator z obraznim lokom': ProductCategory.OSTALO,
  'zirkonij monolit': ProductCategory.FIKSNA_PROTETIKA,
  'zirkonij monolit + plastenje (E-MAX)': ProductCategory.FIKSNA_PROTETIKA,
  'reparatura mostička': ProductCategory.OSTALO,
  'shulter keramika gingivalno': ProductCategory.OSTALO,
  'športni / bruksistični ščitnik': ProductCategory.OSTALO,
  'žlica za beljenje': ProductCategory.OSTALO,
  'akrilna bruksistična trda opornica - Michigenska': ProductCategory.OSTALO,
  'izdelava študijskega modela': ProductCategory.OSTALO,
  'hibridna keramika (prevleke,inlay,luske)': ProductCategory.FIKSNA_PROTETIKA,

  // IMPLANTOLOGIJA (Implantology)
  'akrilna žlica za implantate (za odtis implantata)': ProductCategory.OSTALO,
  'dodatek na abatmant (pri synconu) locator': ProductCategory.IMPLANTOLOGIJA,
  'gingivalna maska 1-3 zob': ProductCategory.OSTALO,
  'gingivalna maska 3-10 zob': ProductCategory.OSTALO,
  'kovinsko keramična prevleka na konfekcijskem abutmentu': ProductCategory.FIKSNA_PROTETIKA,
  'prenosni fiksator iz akrilata - ključek': ProductCategory.OSTALO,
  'svetovalna ura (60min) , pomoč v ordinaciji': ProductCategory.OSTALO,
  'šablona za načrtovanje implantata za rentgen - scan proteza': ProductCategory.OSTALO,
  'zirkon - monolit prevleka na abutmentu': ProductCategory.FIKSNA_PROTETIKA,
  'implantološko podprta totalna proteza': ProductCategory.SNEMNA_PROTETIKA,
  'abutment individual. narejen CAD-CAM Atlantis.. (cena od €200 naprej)': ProductCategory.IMPLANTOLOGIJA,
  'dodatek na abutmant (izbira abumantov)': ProductCategory.IMPLANTOLOGIJA,

  // SNEMNA PROTETIKA (Removable Prosthetics)
  // Note: 'akrilna funkcijska žlica' already mapped above
  'faseta akrilna v Wizil protezi': ProductCategory.ESTETIKA,
  'grizni robnik na Wizil bazi': ProductCategory.OSTALO,
  'imediatna proteza': ProductCategory.SNEMNA_PROTETIKA,
  'izgotovitev Wizil proteze': ProductCategory.SNEMNA_PROTETIKA,
  'konus prevleka (primarna + sekundarna) + kovina': ProductCategory.FIKSNA_PROTETIKA,
  'parcialna proteza s kovinskimi zaponami': ProductCategory.SNEMNA_PROTETIKA,
  'podložitev totalne proteze': ProductCategory.OSTALO,
  'podložitev Wizil proteze': ProductCategory.OSTALO,
  'reparatura proteze osnova, + vsak element 6 €': ProductCategory.OSTALO,
  'totalna proteza + kompozitni nadstandardni zobi doplačilo': ProductCategory.SNEMNA_PROTETIKA,
  'čiščenje in poliranje proteze': ProductCategory.OSTALO,
  'Wizil kovinska baza, enostavna': ProductCategory.SNEMNA_PROTETIKA,
  'Wizil kovinska baza, z lotanjem': ProductCategory.SNEMNA_PROTETIKA,
  'Wizil ogrodje za implantate - mrežica': ProductCategory.SNEMNA_PROTETIKA,
  'Wizil kovinska baza - printana 3D': ProductCategory.SNEMNA_PROTETIKA,
  'Valplast proteza': ProductCategory.SNEMNA_PROTETIKA,
  'izdelava provizorija na trdo folijo': ProductCategory.FIKSNA_PROTETIKA,
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
  return ProductCategory.OSTALO;
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

        // Add price history entry if price changed (convert Decimal to number)
        if (Number(existing.currentPrice) !== product.price) {
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
