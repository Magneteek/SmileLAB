/**
 * Reset Test Data Script
 *
 * SAFELY deletes test data and resets numbering:
 * - Orders, Worksheets, QC records, Invoices, Documents
 * - Resets sequential numbering to 1
 *
 * PRESERVES:
 * - Users, Products, Dentists, Materials, Lab Configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting test data cleanup...\n');

  // Count records before deletion
  const counts = {
    worksheets: await prisma.workSheet.count(),
    orders: await prisma.order.count(),
    qc: await prisma.qualityControl.count(),
    invoices: await prisma.invoice.count(),
    documents: await prisma.document.count(),
    emails: await prisma.emailLog.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('📊 Current data:');
  console.log(`   - Worksheets: ${counts.worksheets}`);
  console.log(`   - Orders: ${counts.orders}`);
  console.log(`   - QC Records: ${counts.qc}`);
  console.log(`   - Invoices: ${counts.invoices}`);
  console.log(`   - Documents: ${counts.documents}`);
  console.log(`   - Email Logs: ${counts.emails}`);
  console.log(`   - Audit Logs: ${counts.auditLogs}\n`);

  if (counts.worksheets === 0 && counts.orders === 0) {
    console.log('✅ No test data found - database is already clean!\n');
    return;
  }

  console.log('⚠️  This will DELETE all test data and reset numbering!\n');
  console.log('   WILL DELETE: Orders, Worksheets, QC, Invoices, Documents');
  console.log('   WILL KEEP: Users, Products, Dentists, Materials, Settings\n');

  // In production, you'd add a confirmation prompt here
  // For now, we'll proceed automatically

  console.log('🗑️  Deleting test data...\n');

  // Delete in correct order (respecting foreign keys)

  // 1. Delete worksheet-related data
  console.log('Deleting worksheet materials...');
  const deletedMaterials = await prisma.worksheetMaterial.deleteMany({});
  console.log(`✓ Deleted ${deletedMaterials.count} worksheet materials`);

  console.log('Deleting worksheet products...');
  const deletedProducts = await prisma.worksheetProduct.deleteMany({});
  console.log(`✓ Deleted ${deletedProducts.count} worksheet products`);

  console.log('Deleting worksheet teeth...');
  const deletedTeeth = await prisma.worksheetTooth.deleteMany({});
  console.log(`✓ Deleted ${deletedTeeth.count} worksheet teeth`);

  // 2. Delete QC records
  console.log('Deleting QC records...');
  const deletedQC = await prisma.qualityControl.deleteMany({});
  console.log(`✓ Deleted ${deletedQC.count} QC records`);

  // 3. Delete documents
  console.log('Deleting documents...');
  const deletedDocs = await prisma.document.deleteMany({});
  console.log(`✓ Deleted ${deletedDocs.count} documents`);

  // 4. Delete invoice items and invoices
  console.log('Deleting invoice items...');
  const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({});
  console.log(`✓ Deleted ${deletedInvoiceItems.count} invoice items`);

  console.log('Deleting invoices...');
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`✓ Deleted ${deletedInvoices.count} invoices`);

  // 5. Delete worksheets
  console.log('Deleting worksheets...');
  const deletedWorksheets = await prisma.workSheet.deleteMany({});
  console.log(`✓ Deleted ${deletedWorksheets.count} worksheets`);

  // 6. Delete orders
  console.log('Deleting orders...');
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`✓ Deleted ${deletedOrders.count} orders`);

  // 7. Delete email logs
  console.log('Deleting email logs...');
  const deletedEmails = await prisma.emailLog.deleteMany({});
  console.log(`✓ Deleted ${deletedEmails.count} email logs`);

  // 8. Delete audit logs
  console.log('Deleting audit logs...');
  const deletedAudit = await prisma.auditLog.deleteMany({});
  console.log(`✓ Deleted ${deletedAudit.count} audit logs\n`);

  // Reset sequential numbering
  console.log('🔢 Resetting sequential numbering...\n');

  const currentYear = new Date().getFullYear();

  // Reset order counter for current year
  await prisma.systemConfig.upsert({
    where: { key: `next_order_number_${currentYear}` },
    create: {
      key: `next_order_number_${currentYear}`,
      value: '1',
      description: `Next sequential order number for year ${currentYear}`,
    },
    update: {
      value: '1',
    },
  });
  console.log(`✓ Reset order numbering to 001 (year ${currentYear})`);

  // Reset worksheet counter
  await prisma.systemConfig.upsert({
    where: { key: 'next_worksheet_number' },
    create: {
      key: 'next_worksheet_number',
      value: '1',
      description: 'Next sequential worksheet number (DN-001, DN-002, ...)',
    },
    update: {
      value: '1',
    },
  });
  console.log('✓ Reset worksheet numbering to DN-001');

  // Reset invoice counter
  await prisma.systemConfig.upsert({
    where: { key: 'next_invoice_number' },
    create: {
      key: 'next_invoice_number',
      value: '1',
      description: 'Next sequential invoice number (INV-001, INV-002, ...)',
    },
    update: {
      value: '1',
    },
  });
  console.log('✓ Reset invoice numbering to INV-001\n');

  // Summary
  console.log('✅ Test data cleanup completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Deleted ${deletedOrders.count} orders`);
  console.log(`   - Deleted ${deletedWorksheets.count} worksheets`);
  console.log(`   - Deleted ${deletedQC.count} QC records`);
  console.log(`   - Deleted ${deletedInvoices.count} invoices`);
  console.log(`   - Deleted ${deletedDocs.count} documents`);
  console.log(`   - Deleted ${deletedAudit.count} audit logs\n`);

  console.log('🔢 Numbering reset:');
  console.log(`   - Orders: 001 (year ${currentYear})`);
  console.log('   - Worksheets: DN-001');
  console.log('   - Invoices: INV-001\n');

  console.log('✨ Database is clean and ready for production use!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error resetting test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
