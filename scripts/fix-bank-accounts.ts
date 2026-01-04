/**
 * Fix Bank Accounts Script
 * Updates bank accounts to have valid IBAN values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBankAccounts() {
  try {
    console.log('Checking bank accounts...\n');

    const bankAccounts = await prisma.bankAccount.findMany({
      select: {
        id: true,
        bankName: true,
        iban: true,
        swiftBic: true,
      },
    });

    console.log(`Found ${bankAccounts.length} bank account(s):\n`);

    for (const account of bankAccounts) {
      console.log(`  ID: ${account.id}`);
      console.log(`  Bank: ${account.bankName}`);
      console.log(`  IBAN: ${account.iban || 'NULL/EMPTY'}`);
      console.log(`  SWIFT: ${account.swiftBic || 'NULL'}`);
      console.log('');
    }

    // Check if any accounts have null/empty IBAN
    const accountsWithoutIban = bankAccounts.filter(a => !a.iban);

    if (accountsWithoutIban.length > 0) {
      console.log(`❌ Found ${accountsWithoutIban.length} account(s) without IBAN`);
      console.log('\nDeleting bank accounts without IBAN...');

      for (const account of accountsWithoutIban) {
        await prisma.bankAccount.delete({
          where: { id: account.id },
        });
        console.log(`  ✅ Deleted: ${account.bankName}`);
      }

      console.log('\n✅ Bank accounts cleaned up!');
      console.log('ℹ️  You can now add them back with proper IBAN values.');
    } else {
      console.log('✅ All bank accounts have valid IBAN values!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBankAccounts();
