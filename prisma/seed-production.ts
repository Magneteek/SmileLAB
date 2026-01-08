/**
 * PRODUCTION Database Seed
 *
 * Creates ONLY:
 * - 2 users (admin + technician)
 * - System configuration
 * - Lab configuration
 *
 * Users will add their own dentists, products, materials via UI
 */

import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PRODUCTION database seed...\n');

  // ============================================================================
  // USERS - PRODUCTION ONLY
  // ============================================================================
  console.log('👥 Creating users...');

  const adminPassword = await hash('DentroAdm1n2026', 12);
  const techPassword = await hash('Dentro3D', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'info@dentro.si' },
    update: {},
    create: {
      email: 'info@dentro.si',
      name: 'Admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: '3d@dentro.si' },
    update: {},
    create: {
      email: '3d@dentro.si',
      name: 'Technician',
      password: techPassword,
      role: Role.TECHNICIAN,
    },
  });

  console.log(`✅ Created 2 production users\n`);

  // ============================================================================
  // SYSTEM CONFIG
  // ============================================================================
  console.log('⚙️  Creating system configuration...');

  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'next_order_number_2026',
        value: '1',
        description: 'Next sequential order number for year 2026',
      },
      {
        key: 'next_worksheet_number',
        value: '1',
        description: 'Next sequential worksheet number (DN-001, DN-002, ...)',
      },
      {
        key: 'next_invoice_number',
        value: '1',
        description: 'Next sequential invoice number (INV-001, INV-002, ...)',
      },
      {
        key: 'default_tax_rate',
        value: '22.00',
        description: 'Default VAT tax rate for Slovenia (%)',
      },
      {
        key: 'default_payment_terms',
        value: '30',
        description: 'Default payment terms in days',
      },
      {
        key: 'document_retention_years',
        value: '10',
        description: 'EU MDR document retention period in years',
      },
      {
        key: 'low_stock_threshold',
        value: '20',
        description: 'Threshold for low stock alerts',
      },
      {
        key: 'expiry_warning_days',
        value: '30',
        description: 'Days before expiry to show warnings',
      },
    ],
  });

  console.log('✅ Created system configuration\n');

  // Lab configuration will be set up via UI in Settings
  console.log('ℹ️  Lab configuration can be set up via UI (Settings → Lab Configuration)\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('✅ PRODUCTION database seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 2 (1 admin, 1 technician)`);
  console.log(`   - System Config: 8 settings\n`);

  console.log('🔑 PRODUCTION Login Credentials:');
  console.log('   Admin:       info@dentro.si / DentroAdm1n2026');
  console.log('   Technician:  3d@dentro.si / Dentro3D');
  console.log('\n⚠️  IMPORTANT: Change these passwords immediately after first login!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Login with admin credentials');
  console.log('   2. Add your dentists via UI');
  console.log('   3. Add your products/pricing list via UI');
  console.log('   4. Add materials inventory via UI\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
