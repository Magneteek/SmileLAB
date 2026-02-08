/**
 * Fix Tax Numbers - Remove SI Prefix
 *
 * Updates all dentist tax numbers to remove "SI" prefix
 * Converts "SI12345678" → "12345678"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTaxNumbers() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Fix Tax Numbers - Remove SI Prefix');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find all dentists with tax numbers starting with "SI"
    const dentistsWithSI = await prisma.dentist.findMany({
      where: {
        taxNumber: {
          startsWith: 'SI',
        },
      },
      select: {
        id: true,
        clinicName: true,
        taxNumber: true,
      },
    });

    console.log(`📊 Found ${dentistsWithSI.length} dentists with "SI" prefix\n`);

    if (dentistsWithSI.length === 0) {
      console.log('✅ No tax numbers to fix!\n');
      return;
    }

    let updated = 0;

    for (const dentist of dentistsWithSI) {
      const oldTaxNumber = dentist.taxNumber!;
      const newTaxNumber = oldTaxNumber.replace(/^SI/, '');

      await prisma.dentist.update({
        where: { id: dentist.id },
        data: { taxNumber: newTaxNumber },
      });

      console.log(`   ✅ ${dentist.clinicName}`);
      console.log(`      Old: ${oldTaxNumber} → New: ${newTaxNumber}\n`);
      updated++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Fix Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 Summary: Updated ${updated} tax numbers\n`);

    // Show all dentists after fix
    const allDentists = await prisma.dentist.findMany({
      where: { active: true },
      select: {
        clinicName: true,
        dentistName: true,
        taxNumber: true,
      },
      orderBy: { clinicName: 'asc' },
    });

    console.log('📋 All Active Dentists:\n');
    allDentists.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.clinicName} - ${d.dentistName}`);
      console.log(`      Tax Number: ${d.taxNumber || '(none)'}\n`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTaxNumbers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
