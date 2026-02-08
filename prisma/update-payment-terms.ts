/**
 * Update Payment Terms - Set All to 15 Days
 *
 * Updates all dentists to have 15 days payment terms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePaymentTerms() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 Update Payment Terms to 15 Days');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find all dentists
    const allDentists = await prisma.dentist.findMany({
      select: {
        id: true,
        clinicName: true,
        dentistName: true,
        paymentTerms: true,
      },
    });

    console.log(`📊 Found ${allDentists.length} dentists\n`);

    // Update all to 15 days
    const result = await prisma.dentist.updateMany({
      data: {
        paymentTerms: 15,
      },
    });

    console.log(`✅ Updated ${result.count} dentists to 15 days payment terms\n`);

    // Show summary
    const updated = await prisma.dentist.findMany({
      select: {
        clinicName: true,
        dentistName: true,
        paymentTerms: true,
        requiresInvoicing: true,
      },
      orderBy: { clinicName: 'asc' },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Update Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 All Dentists:\n');
    updated.forEach((d, i) => {
      const invoicing = d.requiresInvoicing ? '✓ Invoicing' : '✗ No Invoicing';
      console.log(`   ${i + 1}. ${d.clinicName} - ${d.dentistName}`);
      console.log(`      Payment Terms: ${d.paymentTerms} days | ${invoicing}\n`);
    });

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePaymentTerms()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
