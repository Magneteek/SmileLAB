/**
 * Script to add MaterialLots to existing materials
 * Run with: npx ts-node scripts/add-material-lots.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding MaterialLots to existing materials...\n');

  // Get all active materials
  const materials = await prisma.material.findMany({
    where: { active: true },
  });

  console.log(`Found ${materials.length} active materials\n`);

  for (const material of materials) {
    // Check if material already has lots
    const existingLots = await prisma.materialLot.count({
      where: { materialId: material.id },
    });

    if (existingLots > 0) {
      console.log(`✓ ${material.code} already has ${existingLots} lot(s)`);
      continue;
    }

    // Create 2 lots for each material with varying quantities
    const lot1 = await prisma.materialLot.create({
      data: {
        materialId: material.id,
        lotNumber: `LOT-${material.code}-001-${new Date().getFullYear()}`,
        quantityReceived: 1000,
        quantityAvailable: 1000,
        arrivalDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'AVAILABLE',
        supplierName: material.manufacturer,
      },
    });

    const lot2 = await prisma.materialLot.create({
      data: {
        materialId: material.id,
        lotNumber: `LOT-${material.code}-002-${new Date().getFullYear()}`,
        quantityReceived: 500,
        quantityAvailable: 500,
        arrivalDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'AVAILABLE',
        supplierName: material.manufacturer,
      },
    });

    console.log(`✓ Created 2 lots for ${material.code} (${material.name})`);
    console.log(`  - ${lot1.lotNumber}: ${lot1.quantityAvailable} ${material.unit}`);
    console.log(`  - ${lot2.lotNumber}: ${lot2.quantityAvailable} ${material.unit}`);
  }

  console.log('\n✅ Done! All materials now have stock.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
