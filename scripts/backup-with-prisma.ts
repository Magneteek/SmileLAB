/**
 * Alternative Backup Script (No pg_dump required)
 *
 * Creates a JSON backup of critical data using Prisma
 * Smaller than SQL dump but preserves essential data for recovery
 *
 * USAGE:
 * npx tsx scripts/backup-with-prisma.ts
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function createPrismaBackup() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Creating Prisma-based backup...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Create backups directory
    const backupDir = join(process.cwd(), 'backups');
    mkdirSync(backupDir, { recursive: true });

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = join(backupDir, `prisma_backup_${timestamp}.json`);

    console.log('📊 Fetching data from database...\n');

    // Fetch all data (preserved + transactional)
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        type: 'prisma-json-backup'
      },
      // Preserved data
      products: await prisma.product.findMany({ include: { priceHistory: true } }),
      materials: await prisma.material.findMany({ include: { lots: true } }),
      users: await prisma.user.findMany(),
      labConfiguration: await prisma.labConfiguration.findMany({ include: { bankAccounts: true } }),
      systemConfig: await prisma.systemConfig.findMany(),

      // Transactional data (will be deleted by reset)
      dentists: await prisma.dentist.findMany(),
      patients: await prisma.patient.findMany(),
      orders: await prisma.order.findMany(),
      worksheets: await prisma.workSheet.findMany({
        include: {
          teeth: true,
          products: true,
          materials: true,
          qualityControls: true
        }
      }),
      invoices: await prisma.invoice.findMany({ include: { lineItems: true } }),
      documents: await prisma.document.findMany(),
      qualityControls: await prisma.qualityControl.findMany(),
      emailLogs: await prisma.emailLog.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      sops: await prisma.sOP.findMany({ include: { acknowledgments: true } })
    };

    // Calculate counts
    const counts = {
      products: backup.products.length,
      materials: backup.materials.length,
      users: backup.users.length,
      dentists: backup.dentists.length,
      patients: backup.patients.length,
      orders: backup.orders.length,
      worksheets: backup.worksheets.length,
      invoices: backup.invoices.length,
      documents: backup.documents.length
    };

    console.log('📦 Data fetched:');
    console.log(`   • ${counts.products} products (preserved)`);
    console.log(`   • ${counts.materials} materials (preserved)`);
    console.log(`   • ${counts.users} users (preserved)`);
    console.log(`   • ${counts.dentists} dentists (will be deleted)`);
    console.log(`   • ${counts.patients} patients (will be deleted)`);
    console.log(`   • ${counts.orders} orders (will be deleted)`);
    console.log(`   • ${counts.worksheets} worksheets (will be deleted)`);
    console.log(`   • ${counts.invoices} invoices (will be deleted)`);
    console.log(`   • ${counts.documents} documents (will be deleted)\n`);

    // Write to file
    console.log('💾 Writing backup to file...\n');
    writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

    // Get file size
    const stats = require('fs').statSync(backupFile);
    const fileSize = (stats.size / 1024 / 1024).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Backup created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📁 Backup location: ${backupFile}`);
    console.log(`📦 Backup size: ${fileSize} MB`);
    console.log(`📅 Timestamp: ${timestamp}\n`);
    console.log('💡 This backup contains all data in JSON format');
    console.log('   (Not a SQL dump, but can be used to restore data if needed)\n');
    console.log('✅ You can now safely run the production reset script\n');

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPrismaBackup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
