/**
 * Cenik Zunanji 2025 - Product Pricing List Import
 *
 * Imports all 51 products from the official 2025 external pricing list
 * Categories: Fixed Prosthetics, Implantology, Removable Prosthetics
 */

import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProducts2025() {
  console.log('🦷 Seeding products from Cenik Zunanji 2025...');

  const products = [
    // ========================================================================
    // FIKSNA PROTETIKA (Fixed Prosthetics) - 21 items
    // ========================================================================
    {
      code: 'FP-001',
      name: 'akrilna funkcijska žlica',
      category: ProductCategory.TEMPLATE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-002',
      name: 'akrilna grizna šablona',
      category: ProductCategory.TEMPLATE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-003',
      name: 'Bredent polzilo + montaža za 1 element',
      category: ProductCategory.SERVICE,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-004',
      name: 'frezanje ložev v pripravi za Wizil prot.',
      category: ProductCategory.SERVICE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-005',
      name: 'izdelava provizorija laboratorijsko, po zobu',
      category: ProductCategory.PROVISIONAL,
      currentPrice: 30.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-006',
      name: 'izdelava provizorija PMMA CAD-CAM, po zobu',
      category: ProductCategory.PROVISIONAL,
      currentPrice: 28.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-007',
      name: 'keramična faseta',
      category: ProductCategory.VENEER,
      currentPrice: 120.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-008',
      name: 'keramični inlay (PRESS, E-MAX, GC)',
      category: ProductCategory.INLAY,
      currentPrice: 120.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-009',
      name: 'kovinsko keramična prevleka',
      category: ProductCategory.CROWN,
      currentPrice: 100.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-010',
      name: 'navosek, po zobu',
      category: ProductCategory.SERVICE,
      currentPrice: 20.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-011',
      name: 'nočni ščitnik za bruksiste, mehka folija',
      category: ProductCategory.SPLINT,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-012',
      name: 'omavčevanje v artikulator z obraznim lokom',
      category: ProductCategory.SERVICE,
      currentPrice: 5.00,
      unit: 'service',
      active: true,
    },
    {
      code: 'FP-013',
      name: 'zirkonij monolit',
      category: ProductCategory.CROWN,
      currentPrice: 100.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-014',
      name: 'zirkonij monolit + plastenje (E-MAX)',
      category: ProductCategory.CROWN,
      currentPrice: 120.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-015',
      name: 'reparatura mostička',
      category: ProductCategory.REPAIR,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-016',
      name: 'shulter keramika gingivalno',
      category: ProductCategory.SERVICE,
      currentPrice: 10.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'FP-017',
      name: 'športni / bruksistični ščitnik',
      category: ProductCategory.SPLINT,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-018',
      name: 'žlica za beljenje',
      category: ProductCategory.TEMPLATE,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-019',
      name: 'akrilna bruksistična trda opornica - Michigenska',
      category: ProductCategory.SPLINT,
      currentPrice: 150.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-020',
      name: 'izdelava študijskega modela',
      category: ProductCategory.MODEL,
      currentPrice: 5.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'FP-021',
      name: 'hibridna keramika (prevleke,inlay,luske)',
      category: ProductCategory.CROWN,
      currentPrice: 90.00,
      unit: 'tooth',
      active: true,
    },

    // ========================================================================
    // IMPLANTOLOGIJA (Implantology) - 12 items
    // ========================================================================
    {
      code: 'IM-001',
      name: 'akrilna žlica za implantate (za odtis implantata)',
      category: ProductCategory.TEMPLATE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-002',
      name: 'dodatek na abatmant (pri synconu) locator',
      category: ProductCategory.ABUTMENT,
      currentPrice: 40.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-003',
      name: 'gingivalna maska 1-3 zob',
      category: ProductCategory.SERVICE,
      currentPrice: 10.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-004',
      name: 'gingivalna maska 3-10 zob',
      category: ProductCategory.SERVICE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-005',
      name: 'kovinsko keramična prevleka na konfekcijskem abutmentu',
      category: ProductCategory.IMPLANT,
      currentPrice: 120.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'IM-006',
      name: 'prenosni fiksator iz akrilata - ključek',
      category: ProductCategory.TEMPLATE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-007',
      name: 'svetovalna ura (60min), pomoč v ordinaciji',
      category: ProductCategory.SERVICE,
      currentPrice: 60.00,
      unit: 'hour',
      active: true,
    },
    {
      code: 'IM-008',
      name: 'šablona za načrtovanje implantata za rentgen - scan proteza',
      category: ProductCategory.TEMPLATE,
      currentPrice: 150.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-009',
      name: 'zirkon - monolit prevleka na abutmentu',
      category: ProductCategory.IMPLANT,
      currentPrice: 100.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'IM-010',
      name: 'implantološko podprta totalna proteza',
      category: ProductCategory.DENTURE,
      currentPrice: 250.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-011',
      name: 'abutment individual. narejen CAD-CAM Atlantis.. (cena od €200 naprej)',
      category: ProductCategory.ABUTMENT,
      currentPrice: 200.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'IM-012',
      name: 'dodatek na abutmant (izbira abumantov)',
      category: ProductCategory.ABUTMENT,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },

    // ========================================================================
    // SNEMNA PROTETIKA (Removable Prosthetics) - 18 items
    // ========================================================================
    {
      code: 'SP-001',
      name: 'akrilna funkcijska žlica',
      category: ProductCategory.TEMPLATE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-002',
      name: 'faseta akrilna v Wizil protezi',
      category: ProductCategory.VENEER,
      currentPrice: 30.00,
      unit: 'tooth',
      active: true,
    },
    {
      code: 'SP-003',
      name: 'grizni robnik na Wizil bazi',
      category: ProductCategory.SERVICE,
      currentPrice: 5.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-004',
      name: 'imediatna proteza',
      category: ProductCategory.DENTURE,
      currentPrice: 120.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-005',
      name: 'izgotovitev Wizil proteze',
      category: ProductCategory.DENTURE,
      currentPrice: 170.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-006',
      name: 'konus prevleka (primarna + sekundarna) + kovina',
      category: ProductCategory.CROWN,
      currentPrice: 200.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-007',
      name: 'parcialna proteza s kovinskimi zaponami',
      category: ProductCategory.DENTURE,
      currentPrice: 160.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-008',
      name: 'podložitev totalne proteze',
      category: ProductCategory.SERVICE,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-009',
      name: 'podložitev Wizil proteze',
      category: ProductCategory.SERVICE,
      currentPrice: 60.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-010',
      name: 'reparatura proteze osnova, + vsak element 6 €',
      category: ProductCategory.REPAIR,
      currentPrice: 40.00,
      unit: 'piece',
      active: true,
      description: 'Base repair + €6 per additional element',
    },
    {
      code: 'SP-011',
      name: 'totalna proteza + kompozitni nadstandardni zobi doplačilo',
      category: ProductCategory.DENTURE,
      currentPrice: 180.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-012',
      name: 'čiščenje in poliranje proteze',
      category: ProductCategory.SERVICE,
      currentPrice: 20.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-013',
      name: 'Wizil kovinska baza, enostavna',
      category: ProductCategory.DENTURE,
      currentPrice: 140.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-014',
      name: 'Wizil kovinska baza, z lotanjem',
      category: ProductCategory.DENTURE,
      currentPrice: 150.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-015',
      name: 'Wizil ogrodje za implantate - mrežica',
      category: ProductCategory.DENTURE,
      currentPrice: 120.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-016',
      name: 'Wizil kovinska baza - printana 3D',
      category: ProductCategory.DENTURE,
      currentPrice: 150.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-017',
      name: 'Valplast proteza',
      category: ProductCategory.DENTURE,
      currentPrice: 220.00,
      unit: 'piece',
      active: true,
    },
    {
      code: 'SP-018',
      name: 'izdelava provizorija na trdo folijo',
      category: ProductCategory.PROVISIONAL,
      currentPrice: 100.00,
      unit: 'piece',
      active: true,
    },
  ];

  console.log(`📦 Creating ${products.length} products...`);

  let created = 0;
  let skipped = 0;

  for (const productData of products) {
    try {
      await prisma.product.upsert({
        where: { code: productData.code },
        update: {
          name: productData.name,
          category: productData.category,
          currentPrice: productData.currentPrice,
          unit: productData.unit,
          active: productData.active,
          description: productData.description,
        },
        create: productData,
      });
      created++;
      console.log(`✅ ${productData.code}: ${productData.name}`);
    } catch (error) {
      console.error(`❌ Failed to create ${productData.code}:`, error);
      skipped++;
    }
  }

  console.log(`\n✨ Product seeding complete!`);
  console.log(`   Created/Updated: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${products.length}`);
}

// Run if called directly
if (require.main === module) {
  seedProducts2025()
    .catch((e) => {
      console.error('❌ Error seeding products:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
