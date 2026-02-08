/**
 * Bulk Product/Pricing Import Script
 *
 * Imports DENTRO 2026 pricing list (51 products)
 * Source: Dentro Zunanji Cenik 2026.pdf
 *
 * USAGE:
 * npx tsx prisma/seed-products.ts
 */

import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductData {
  code: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: string;
  description?: string;
}

// ============================================================================
// DENTRO 2026 PRICING LIST
// ============================================================================

const PRODUCTS: ProductData[] = [
  // FIKSNA PROTETIKA (Fixed Prosthetics)
  { code: 'PRD-001', name: 'akrilna funkcijska žlica', category: 'FIKSNA_PROTETIKA', price: 20.00, unit: 'kos' },
  { code: 'PRD-002', name: 'akrilna grizna šablona', category: 'FIKSNA_PROTETIKA', price: 20.00, unit: 'kos' },
  { code: 'PRD-003', name: 'Bredent polzilo + montaža za 1 element', category: 'FIKSNA_PROTETIKA', price: 60.00, unit: 'kos' },
  { code: 'PRD-004', name: 'frezanje ložev v pripravi za Wizil prot.', category: 'FIKSNA_PROTETIKA', price: 20.00, unit: 'kos' },
  { code: 'PRD-005', name: 'izdelava provizorija laboratorijsko, po zobu', category: 'FIKSNA_PROTETIKA', price: 30.00, unit: 'zob' },
  { code: 'PRD-006', name: 'izdelava provizorija PMMA CAD-CAM, po zobu', category: 'FIKSNA_PROTETIKA', price: 30.00, unit: 'zob' },
  { code: 'PRD-007', name: 'keramična faseta', category: 'ESTETIKA', price: 120.00, unit: 'kos' },
  { code: 'PRD-008', name: 'keramični inlay (PRESS, E-MAX, GC)', category: 'FIKSNA_PROTETIKA', price: 120.00, unit: 'kos' },
  { code: 'PRD-009', name: 'kovinsko keramična prevleka', category: 'FIKSNA_PROTETIKA', price: 100.00, unit: 'kos' },
  { code: 'PRD-010', name: 'navosek, po zobu', category: 'FIKSNA_PROTETIKA', price: 20.00, unit: 'zob' },
  { code: 'PRD-011', name: 'nočni ščitnik za bruksiste, mehka folija', category: 'OSTALO', price: 60.00, unit: 'kos' },
  { code: 'PRD-012', name: 'omavčevanje v artikulator z obraznim lokom', category: 'OSTALO', price: 5.00, unit: 'kos' },
  { code: 'PRD-013', name: 'zirkonij monolit', category: 'FIKSNA_PROTETIKA', price: 100.00, unit: 'kos' },
  { code: 'PRD-014', name: 'zirkonij monolit + plastenje (E-MAX)', category: 'FIKSNA_PROTETIKA', price: 120.00, unit: 'kos' },
  { code: 'PRD-015', name: 'reparatura mostička', category: 'OSTALO', price: 20.00, unit: 'kos' },
  { code: 'PRD-016', name: 'shulter keramika gingivalno', category: 'FIKSNA_PROTETIKA', price: 10.00, unit: 'kos' },
  { code: 'PRD-017', name: 'športni / bruksistični ščitnik, reteiner orto', category: 'OSTALO', price: 60.00, unit: 'kos' },
  { code: 'PRD-018', name: 'žlica za beljenje', category: 'ESTETIKA', price: 60.00, unit: 'kos' },
  { code: 'PRD-019', name: 'akrilna bruksistična trda opornica - Michigenska', category: 'OSTALO', price: 150.00, unit: 'kos' },
  { code: 'PRD-020', name: 'izdelava študijskega modela', category: 'OSTALO', price: 5.00, unit: 'kos' },
  { code: 'PRD-021', name: 'hibridna keramika (prevleke,inlay,luske)', category: 'ESTETIKA', price: 90.00, unit: 'kos' },
  { code: 'PRD-022', name: 'izdelava modela 3D print', category: 'OSTALO', price: 25.00, unit: 'kos' },

  // IMPLANTOLOGIJA (Implantology)
  { code: 'PRD-023', name: 'akrilna žlica za implantate (za odtis implantata)', category: 'IMPLANTOLOGIJA', price: 20.00, unit: 'kos' },
  { code: 'PRD-024', name: 'dodatek na abatmant (pri synconu) locator', category: 'IMPLANTOLOGIJA', price: 40.00, unit: 'kos' },
  { code: 'PRD-025', name: 'gingivalna maska 1-3 zob', category: 'IMPLANTOLOGIJA', price: 10.00, unit: 'kos' },
  { code: 'PRD-026', name: 'gingivalna maska 3-10 zob', category: 'IMPLANTOLOGIJA', price: 20.00, unit: 'kos' },
  { code: 'PRD-027', name: 'kovinsko keramična prevleka na konfekcijskem abutmentu', category: 'IMPLANTOLOGIJA', price: 120.00, unit: 'kos' },
  { code: 'PRD-028', name: 'prenosni fiksator iz akrilata - ključek', category: 'IMPLANTOLOGIJA', price: 20.00, unit: 'kos' },
  { code: 'PRD-029', name: 'svetovalna ura (60min), pomoč v ordinaciji', category: 'OSTALO', price: 60.00, unit: 'ura' },
  { code: 'PRD-030', name: 'šablona za načrtovanje implantata za rentgen - scan proteza', category: 'IMPLANTOLOGIJA', price: 150.00, unit: 'kos' },
  { code: 'PRD-031', name: 'zirkon - monolit prevleka na abutmentu', category: 'IMPLANTOLOGIJA', price: 100.00, unit: 'kos' },
  { code: 'PRD-032', name: 'implantološko podprta totalna proteza', category: 'IMPLANTOLOGIJA', price: 250.00, unit: 'kos' },
  { code: 'PRD-033', name: 'abutment individual. narejen CAD-CAM Atlantis (cena od €200 naprej)', category: 'IMPLANTOLOGIJA', price: 200.00, unit: 'kos' },
  { code: 'PRD-034', name: 'dodatek na abutmant (izbira abumantov)', category: 'IMPLANTOLOGIJA', price: 20.00, unit: 'kos' },
  { code: 'PRD-035', name: 'cementiranje abutmant na prevleko', category: 'IMPLANTOLOGIJA', price: 5.00, unit: 'kos' },
  { code: 'PRD-036', name: 'zirkon prevleka dodatek infiltriranje (opaker)', category: 'IMPLANTOLOGIJA', price: 6.00, unit: 'kos' },

  // SNEMNA PROTETIKA (Removable Prosthetics)
  { code: 'PRD-037', name: 'akrilna funkcijska žlica', category: 'SNEMNA_PROTETIKA', price: 20.00, unit: 'kos' },
  { code: 'PRD-038', name: 'faseta akrilna v Wizil protezi', category: 'SNEMNA_PROTETIKA', price: 30.00, unit: 'kos' },
  { code: 'PRD-039', name: 'grizni robnik na Wizil bazi', category: 'SNEMNA_PROTETIKA', price: 5.00, unit: 'kos' },
  { code: 'PRD-040', name: 'imediatna proteza', category: 'SNEMNA_PROTETIKA', price: 120.00, unit: 'kos' },
  { code: 'PRD-041', name: 'izgotovitev Wizil proteze', category: 'SNEMNA_PROTETIKA', price: 170.00, unit: 'kos' },
  { code: 'PRD-042', name: 'konus prevleka (primarna + sekundarna) + kovina', category: 'SNEMNA_PROTETIKA', price: 200.00, unit: 'kos' },
  { code: 'PRD-043', name: 'parcialna proteza s kovinskimi zaponami', category: 'SNEMNA_PROTETIKA', price: 160.00, unit: 'kos' },
  { code: 'PRD-044', name: 'podložitev totalne proteze', category: 'SNEMNA_PROTETIKA', price: 60.00, unit: 'kos' },
  { code: 'PRD-045', name: 'podložitev Wizil proteze', category: 'SNEMNA_PROTETIKA', price: 60.00, unit: 'kos' },
  { code: 'PRD-046', name: 'reparatura proteze osnova, + vsak element 6 €', category: 'SNEMNA_PROTETIKA', price: 40.00, unit: 'kos' },
  { code: 'PRD-047', name: 'totalna proteza + kompozitni nadstandardni zobi doplačilo', category: 'SNEMNA_PROTETIKA', price: 180.00, unit: 'kos' },
  { code: 'PRD-048', name: 'čiščenje in poliranje proteze', category: 'SNEMNA_PROTETIKA', price: 20.00, unit: 'kos' },
  { code: 'PRD-049', name: 'Wizil kovinska baza, enostavna', category: 'SNEMNA_PROTETIKA', price: 140.00, unit: 'kos' },
  { code: 'PRD-050', name: 'Wizil kovinska baza, z lotanjem', category: 'SNEMNA_PROTETIKA', price: 150.00, unit: 'kos' },
  { code: 'PRD-051', name: 'Wizil ogrodje za implantate - mrežica', category: 'SNEMNA_PROTETIKA', price: 120.00, unit: 'kos' },
  { code: 'PRD-052', name: 'Wizil kovinska baza - printana 3D', category: 'SNEMNA_PROTETIKA', price: 150.00, unit: 'kos' },
  { code: 'PRD-053', name: 'Valplast proteza', category: 'SNEMNA_PROTETIKA', price: 220.00, unit: 'kos' },
  { code: 'PRD-054', name: 'izdelava provizorija na trdo folijo', category: 'SNEMNA_PROTETIKA', price: 100.00, unit: 'kos' },
];

// ============================================================================
// IMPORT LOGIC
// ============================================================================

async function seedProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 DENTRO 2026 Pricing List Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📊 Found ${PRODUCTS.length} products to import...\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const productData of PRODUCTS) {
    try {
      // Check if product already exists (by code)
      const existing = await prisma.product.findUnique({
        where: { code: productData.code }
      });

      if (existing) {
        // Update existing product
        await prisma.product.update({
          where: { code: productData.code },
          data: {
            name: productData.name,
            category: productData.category,
            currentPrice: productData.price,
            unit: productData.unit,
            description: productData.description,
            active: true
          }
        });

        // Create price history record
        await prisma.productPriceHistory.create({
          data: {
            productId: existing.id,
            price: productData.price,
            effectiveFrom: new Date(),
            reason: 'Cenik 2026 - Updated'
          }
        });

        console.log(`   ✅ Updated: ${productData.code} - ${productData.name} (€${productData.price})`);
        updated++;
      } else {
        // Create new product
        const newProduct = await prisma.product.create({
          data: {
            code: productData.code,
            name: productData.name,
            category: productData.category,
            currentPrice: productData.price,
            unit: productData.unit,
            description: productData.description,
            active: true
          }
        });

        // Create initial price history record
        await prisma.productPriceHistory.create({
          data: {
            productId: newProduct.id,
            price: productData.price,
            effectiveFrom: new Date(),
            reason: 'Cenik 2026 - Initial price'
          }
        });

        console.log(`   ✅ Created: ${productData.code} - ${productData.name} (€${productData.price})`);
        created++;
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${productData.code} - ${error.message}`);
      skipped++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Import Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Summary:');
  console.log(`   • ${created} products created`);
  console.log(`   • ${updated} products updated`);
  console.log(`   • ${skipped} errors/skipped\n`);

  // Summary by category
  console.log('📋 Products by Category:\n');

  const categories = await prisma.product.groupBy({
    by: ['category'],
    where: { active: true },
    _count: { category: true }
  });

  categories.forEach((cat) => {
    const categoryName = {
      'FIKSNA_PROTETIKA': 'Fiksna protetika',
      'SNEMNA_PROTETIKA': 'Snemna protetika',
      'IMPLANTOLOGIJA': 'Implantologija',
      'ESTETIKA': 'Estetika',
      'OSTALO': 'Ostalo'
    }[cat.category] || cat.category;

    console.log(`   • ${categoryName}: ${cat._count.category} products`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the import
seedProducts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
