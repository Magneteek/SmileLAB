/**
 * Cleanup Script - Delete All Orders, Worksheets, Invoices
 *
 * WARNING: This will delete ALL data from:
 * - Orders
 * - Worksheets (and related: teeth, products, materials)
 * - Quality Controls
 * - Invoices
 * - Documents
 * - Email Logs
 * - Audit Logs
 *
 * Use only for development/testing environments!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Starting comprehensive data cleanup...\n');

  try {
    // Delete in order of dependencies (child tables first)

    console.log('Deleting WorksheetTooth records...');
    const deletedTeeth = await prisma.worksheetTooth.deleteMany({});
    console.log(`✓ Deleted ${deletedTeeth.count} worksheet teeth`);

    console.log('Deleting WorksheetProductMaterial records...');
    const deletedProductMaterials = await prisma.worksheetProductMaterial.deleteMany({});
    console.log(`✓ Deleted ${deletedProductMaterials.count} worksheet product materials`);

    console.log('Deleting WorksheetProduct records...');
    const deletedProducts = await prisma.worksheetProduct.deleteMany({});
    console.log(`✓ Deleted ${deletedProducts.count} worksheet products`);

    console.log('Deleting WorksheetMaterial records...');
    const deletedMaterials = await prisma.worksheetMaterial.deleteMany({});
    console.log(`✓ Deleted ${deletedMaterials.count} worksheet materials`);

    console.log('Deleting QualityControl records...');
    const deletedQC = await prisma.qualityControl.deleteMany({});
    console.log(`✓ Deleted ${deletedQC.count} quality control records`);

    console.log('Deleting Document records...');
    const deletedDocs = await prisma.document.deleteMany({});
    console.log(`✓ Deleted ${deletedDocs.count} documents`);

    console.log('Deleting EmailLog records...');
    const deletedEmails = await prisma.emailLog.deleteMany({});
    console.log(`✓ Deleted ${deletedEmails.count} email logs`);

    console.log('Deleting Invoice records...');
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✓ Deleted ${deletedInvoices.count} invoices`);

    console.log('Deleting WorkSheet records...');
    const deletedWorksheets = await prisma.workSheet.deleteMany({});
    console.log(`✓ Deleted ${deletedWorksheets.count} worksheets`);

    console.log('Deleting Order records...');
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✓ Deleted ${deletedOrders.count} orders`);

    console.log('Deleting AuditLog records...');
    const deletedAuditLogs = await prisma.auditLog.deleteMany({});
    console.log(`✓ Deleted ${deletedAuditLogs.count} audit logs`);

    // Reset order counter to 1
    console.log('\nResetting order counter...');
    const currentYear = new Date().getFullYear();
    const configKey = `next_order_number_${currentYear}`;

    await prisma.systemConfig.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: '1',
        description: `Next sequential order number for year ${currentYear}`,
      },
      update: {
        value: '1',
      },
    });
    console.log('✓ Order counter reset to 1');

    console.log('\n✅ Cleanup complete! Database is ready for fresh data.');
    console.log('\nNext order will be: 26001');
    console.log('Next worksheet will be: DN-001');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanup()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
