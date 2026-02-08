/**
 * Production Database Reset Script
 *
 * PRESERVES:
 * - Products (pricing list)
 * - Product price history
 * - System configuration
 * - Lab configuration & bank accounts
 * - User accounts
 * - Material master data (types only)
 *
 * DELETES:
 * - All orders, worksheets, invoices
 * - All dentists and patients
 * - All documents (MDR Annex, invoices)
 * - Material stock/lots
 * - QC records, emails, audit logs
 *
 * RESETS:
 * - Order numbering (back to 001)
 * - Worksheet numbering (DN-XXX)
 * - Invoice numbering (RAC-YYYY-XXX)
 *
 * USAGE:
 * npx tsx prisma/reset-for-production.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to safely delete from tables (handles missing tables)
async function safeDelete(tableName: string, deleteFn: () => Promise<any>): Promise<number> {
  try {
    const result = await deleteFn();
    const count = result.count || 0;
    console.log(`   ✅ Deleted ${count} ${tableName}`);
    return count;
  } catch (error: any) {
    if (error.code === 'P2021') {
      console.log(`   ⚠️  Skipped ${tableName} (table doesn't exist)`);
      return 0;
    }
    throw error;
  }
}

async function resetForProduction() {
  console.log('🚀 Starting production database reset...\n');

  try {
    // Step 1: Delete all transactional data (in correct order due to foreign keys)
    console.log('📋 Step 1: Deleting transactional data...');

    // Delete SOP acknowledgments first
    await safeDelete('SOP acknowledgments', () => prisma.sOPAcknowledgment.deleteMany({}));

    // Delete SOPs
    await safeDelete('SOPs', () => prisma.sOP.deleteMany({}));

    // Delete email logs
    await safeDelete('email logs', () => prisma.emailLog.deleteMany({}));

    // Delete invoice line items
    await safeDelete('invoice line items', () => prisma.invoiceLineItem.deleteMany({}));

    // Delete invoices
    const invoices = await safeDelete('invoices', () => prisma.invoice.deleteMany({}));

    // Delete documents
    const docs = await safeDelete('documents', () => prisma.document.deleteMany({}));

    // Delete QC records
    await safeDelete('quality control records', () => prisma.qualityControl.deleteMany({}));

    // Delete worksheet-material junction table
    await safeDelete('worksheet-material associations', () => prisma.worksheetMaterial.deleteMany({}));

    // Delete worksheet-product-material junction table
    await safeDelete('worksheet-product-material associations', () => prisma.worksheetProductMaterial.deleteMany({}));

    // Delete worksheet products
    await safeDelete('worksheet products', () => prisma.worksheetProduct.deleteMany({}));

    // Delete worksheet teeth
    await safeDelete('worksheet teeth selections', () => prisma.worksheetTooth.deleteMany({}));

    // Delete worksheets
    const worksheets = await safeDelete('worksheets', () => prisma.workSheet.deleteMany({}));

    // Delete orders
    const orders = await safeDelete('orders', () => prisma.order.deleteMany({}));

    // Delete material lots (inventory)
    const lots = await safeDelete('material lots (inventory)', () => prisma.materialLot.deleteMany({}));

    // Delete patients
    await safeDelete('patients', () => prisma.patient.deleteMany({}));

    // Delete dentists
    const dentists = await safeDelete('dentists', () => prisma.dentist.deleteMany({}));

    // Delete audit logs
    await safeDelete('audit log entries', () => prisma.auditLog.deleteMany({}));

    // Delete password resets
    await safeDelete('password reset tokens', () => prisma.passwordReset.deleteMany({}));

    console.log('\n✅ Step 1 complete: All transactional data deleted\n');

    // Step 2: Reset auto-numbering sequences
    console.log('🔢 Step 2: Resetting auto-numbering sequences...');

    // Reset order number to 1
    await prisma.systemConfig.upsert({
      where: { key: 'next_order_number' },
      update: { value: '1' },
      create: {
        key: 'next_order_number',
        value: '1',
        description: 'Next sequential order number'
      }
    });
    console.log('   ✅ Order numbering reset to 001');

    // Reset worksheet number to 1
    await prisma.systemConfig.upsert({
      where: { key: 'next_worksheet_number' },
      update: { value: '1' },
      create: {
        key: 'next_worksheet_number',
        value: '1',
        description: 'Next sequential worksheet number (DN-XXX)'
      }
    });
    console.log('   ✅ Worksheet numbering reset to DN-001');

    // Reset invoice number counter for current year
    const currentYear = new Date().getFullYear();
    await prisma.systemConfig.upsert({
      where: { key: `invoice_counter_${currentYear}` },
      update: { value: '0' },
      create: {
        key: `invoice_counter_${currentYear}`,
        value: '0',
        description: `Invoice counter for year ${currentYear}`
      }
    });
    console.log(`   ✅ Invoice numbering reset to RAC-${currentYear}-001`);

    console.log('\n✅ Step 2 complete: Auto-numbering sequences reset\n');

    // Step 3: Summary of preserved data
    console.log('📊 Step 3: Summary of preserved data...');

    const productsCount = await prisma.product.count();
    console.log(`   ✅ ${productsCount} products preserved (pricing list)`);

    const priceHistoryCount = await prisma.productPriceHistory.count();
    console.log(`   ✅ ${priceHistoryCount} price history records preserved`);

    const materialsCount = await prisma.material.count();
    console.log(`   ✅ ${materialsCount} material types preserved (master data)`);

    const usersCount = await prisma.user.count();
    console.log(`   ✅ ${usersCount} user accounts preserved`);

    const labConfigCount = await prisma.labConfiguration.count();
    console.log(`   ✅ ${labConfigCount} lab configuration records preserved`);

    const bankAccountsCount = await prisma.bankAccount.count();
    console.log(`   ✅ ${bankAccountsCount} bank accounts preserved`);

    const systemConfigCount = await prisma.systemConfig.count();
    console.log(`   ✅ ${systemConfigCount} system configuration entries preserved`);

    console.log('\n✅ Step 3 complete: Data preservation verified\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ DATABASE RESET COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 PRESERVED DATA:');
    console.log(`   • ${productsCount} Products (pricing list)`);
    console.log(`   • ${priceHistoryCount} Price history records`);
    console.log(`   • ${materialsCount} Material types`);
    console.log(`   • ${usersCount} User accounts`);
    console.log(`   • ${labConfigCount} Lab configuration`);
    console.log(`   • ${bankAccountsCount} Bank accounts`);
    console.log(`   • ${systemConfigCount} System settings\n`);

    console.log('🗑️  DELETED DATA:');
    console.log(`   • ${orders} Orders`);
    console.log(`   • ${worksheets} Worksheets`);
    console.log(`   • ${invoices} Invoices`);
    console.log(`   • ${dentists} Dentists`);
    console.log(`   • ${docs} Documents`);
    console.log(`   • ${lots} Material lots (inventory)\n`);

    console.log('🔢 RESET SEQUENCES:');
    console.log('   • Next order: 001');
    console.log('   • Next worksheet: DN-001');
    console.log(`   • Next invoice: RAC-${currentYear}-001\n`);

    console.log('✅ Your database is now ready for production use!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetForProduction()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
