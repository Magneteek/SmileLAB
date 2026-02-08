/**
 * Cleanup Script - Remove Duplicate Products
 * 
 * Removes old products with FP-, IM-, SP- codes
 * Keeps only PRD- codes (DENTRO 2026 official pricing list)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Cleanup Duplicate Products');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Count before cleanup
    const beforeCount = await prisma.product.count();
    console.log(`📊 Current products: ${beforeCount}\n`);

    // Delete products with old codes
    const deleteResult = await prisma.product.deleteMany({
      where: {
        OR: [
          { code: { startsWith: 'FP-' } },
          { code: { startsWith: 'IM-' } },
          { code: { startsWith: 'SP-' } },
        ],
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} old products (FP-, IM-, SP- codes)\n`);

    // Count after cleanup
    const afterCount = await prisma.product.count();
    console.log(`📊 Remaining products: ${afterCount}\n`);

    // Show remaining products
    const remaining = await prisma.product.findMany({
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });

    console.log('📋 Remaining Products:\n');
    remaining.forEach((p) => {
      console.log(`   ${p.code} - ${p.name}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Cleanup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
