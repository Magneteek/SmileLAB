/**
 * Database Cleanup Script
 *
 * Removes all data EXCEPT:
 * - Products and product price history
 * - System configuration
 * - Laboratory configuration
 *
 * Keeps user accounts for production
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    await prisma.$transaction(async (tx) => {
      // Delete in correct order (respecting foreign keys)

      console.log('📧 Deleting email logs...');
      const emailLogs = await tx.emailLog.deleteMany();
      console.log(`   ✅ Deleted ${emailLogs.count} email logs`);

      console.log('📄 Deleting documents...');
      const documents = await tx.document.deleteMany();
      console.log(`   ✅ Deleted ${documents.count} documents`);

      console.log('🧾 Deleting invoices...');
      const invoices = await tx.invoice.deleteMany();
      console.log(`   ✅ Deleted ${invoices.count} invoices`);

      console.log('✅ Deleting quality controls...');
      const qcs = await tx.qualityControl.deleteMany();
      console.log(`   ✅ Deleted ${qcs.count} quality control records`);

      console.log('📦 Deleting worksheet materials...');
      const worksheetMaterials = await tx.worksheetMaterial.deleteMany();
      console.log(`   ✅ Deleted ${worksheetMaterials.count} worksheet materials`);

      console.log('📦 Deleting worksheet products...');
      const worksheetProducts = await tx.worksheetProduct.deleteMany();
      console.log(`   ✅ Deleted ${worksheetProducts.count} worksheet products`);

      console.log('🦷 Deleting worksheet teeth...');
      const worksheetTeeth = await tx.worksheetTooth.deleteMany();
      console.log(`   ✅ Deleted ${worksheetTeeth.count} worksheet teeth`);

      console.log('📋 Deleting worksheets...');
      const worksheets = await tx.workSheet.deleteMany();
      console.log(`   ✅ Deleted ${worksheets.count} worksheets`);

      console.log('📦 Deleting orders...');
      const orders = await tx.order.deleteMany();
      console.log(`   ✅ Deleted ${orders.count} orders`);

      console.log('👤 Deleting patients...');
      const patients = await tx.patient.deleteMany();
      console.log(`   ✅ Deleted ${patients.count} patients`);

      console.log('🦷 Deleting dentists...');
      const dentists = await tx.dentist.deleteMany();
      console.log(`   ✅ Deleted ${dentists.count} dentists`);

      console.log('🧪 Deleting material lots...');
      const materialLots = await tx.materialLot.deleteMany();
      console.log(`   ✅ Deleted ${materialLots.count} material lots`);

      console.log('🧪 Deleting materials...');
      const materials = await tx.material.deleteMany();
      console.log(`   ✅ Deleted ${materials.count} materials`);

      console.log('📊 Deleting audit logs...');
      const auditLogs = await tx.auditLog.deleteMany();
      console.log(`   ✅ Deleted ${auditLogs.count} audit logs`);

      console.log('\n✅ Database cleanup completed successfully!');
      console.log('\n📦 Data PRESERVED:');

      const productsCount = await tx.product.count();
      const usersCount = await tx.user.count();
      const configCount = await tx.systemConfig.count();
      const labConfigCount = await tx.labConfiguration.count();

      console.log(`   - Users: ${usersCount}`);
      console.log(`   - Products: ${productsCount}`);
      console.log(`   - System Configuration: ${configCount}`);
      console.log(`   - Laboratory Configuration: ${labConfigCount}`);
    });

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanDatabase()
  .then(() => {
    console.log('\n✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  });
