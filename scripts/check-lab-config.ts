/**
 * Check Lab Configuration Script
 * Quick check to see if lab configuration exists
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLabConfig() {
  try {
    const config = await prisma.labConfiguration.findFirst();

    if (config) {
      console.log('✅ Lab configuration EXISTS in database:');
      console.log('   ID:', config.id);
      console.log('   Laboratory Name:', config.laboratoryName);
      console.log('   Email:', config.email);
      console.log('   Created:', config.createdAt);
      console.log('\nℹ️  The form should use PATCH to update, not POST to create');
    } else {
      console.log('❌ No lab configuration found in database');
      console.log('ℹ️  The form should use POST to create');
    }

    // Check bank accounts
    const bankCount = await prisma.bankAccount.count();
    console.log(`\n💳 Bank accounts: ${bankCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLabConfig();
