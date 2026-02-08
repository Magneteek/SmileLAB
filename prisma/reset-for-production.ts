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

async function resetForProduction() {
  console.log('🚀 Starting production database reset...\n');

  try {
    // Step 1: Delete all transactional data (in correct order due to foreign keys)
    console.log('📋 Step 1: Deleting transactional data...');

    // Delete SOP acknowledgments first
    const sopAcks = await prisma.sOPAcknowledgment.deleteMany({});
    console.log(`   ✅ Deleted ${sopAcks.count} SOP acknowledgments`);

    // Delete SOPs
    const sops = await prisma.sOP.deleteMany({});
    console.log(`   ✅ Deleted ${sops.count} SOPs`);

    // Delete email logs
    const emails = await prisma.emailLog.deleteMany({});
    console.log(`   ✅ Deleted ${emails.count} email logs`);

    // Delete invoice line items
    const lineItems = await prisma.invoiceLineItem.deleteMany({});
    console.log(`   ✅ Deleted ${lineItems.count} invoice line items`);

    // Delete invoices
    const invoices = await prisma.invoice.deleteMany({});
    console.log(`   ✅ Deleted ${invoices.count} invoices`);

    // Delete documents
    const docs = await prisma.document.deleteMany({});
    console.log(`   ✅ Deleted ${docs.count} documents`);

    // Delete QC records
    const qcs = await prisma.qualityControl.deleteMany({});
    console.log(`   ✅ Deleted ${qcs.count} quality control records`);

    // Delete worksheet-material junction table
    const wsMaterials = await prisma.worksheetMaterial.deleteMany({});
    console.log(`   ✅ Deleted ${wsMaterials.count} worksheet-material associations`);

    // Delete worksheet-product-material junction table
    const wsProductMaterials = await prisma.worksheetProductMaterial.deleteMany({});
    console.log(`   ✅ Deleted ${wsProductMaterials.count} worksheet-product-material associations`);

    // Delete worksheet products
    const wsProducts = await prisma.worksheetProduct.deleteMany({});
    console.log(`   ✅ Deleted ${wsProducts.count} worksheet products`);

    // Delete worksheet teeth
    const wsTeeth = await prisma.worksheetTooth.deleteMany({});
    console.log(`   ✅ Deleted ${wsTeeth.count} worksheet teeth selections`);

    // Delete worksheets
    const worksheets = await prisma.workSheet.deleteMany({});
    console.log(`   ✅ Deleted ${worksheets.count} worksheets`);

    // Delete orders
    const orders = await prisma.order.deleteMany({});
    console.log(`   ✅ Deleted ${orders.count} orders`);

    // Delete material lots (inventory)
    const lots = await prisma.materialLot.deleteMany({});
    console.log(`   ✅ Deleted ${lots.count} material lots (inventory)`);

    // Delete patients
    const patients = await prisma.patient.deleteMany({});
    console.log(`   ✅ Deleted ${patients.count} patients`);

    // Delete dentists
    const dentists = await prisma.dentist.deleteMany({});
    console.log(`   ✅ Deleted ${dentists.count} dentists`);

    // Delete audit logs
    const audits = await prisma.auditLog.deleteMany({});
    console.log(`   ✅ Deleted ${audits.count} audit log entries`);

    // Delete password resets
    const passwordResets = await prisma.passwordReset.deleteMany({});
    console.log(`   ✅ Deleted ${passwordResets.count} password reset tokens`);

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
    console.log(`   • ${orders.count} Orders`);
    console.log(`   • ${worksheets.count} Worksheets`);
    console.log(`   • ${invoices.count} Invoices`);
    console.log(`   • ${dentists.count} Dentists`);
    console.log(`   • ${patients.count} Patients`);
    console.log(`   • ${docs.count} Documents`);
    console.log(`   • ${lots.count} Material lots (inventory)`);
    console.log(`   • ${qcs.count} QC records`);
    console.log(`   • ${emails.count} Email logs`);
    console.log(`   • ${audits.count} Audit logs\n`);

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
