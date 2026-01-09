/**
 * Database Seed Script
 *
 * Creates sample data for development and testing:
 * - Users (all roles)
 * - Dentists and patients
 * - Products catalog
 * - Materials and LOTs
 * - System configuration
 */

import { PrismaClient, Role, ProductCategory, MaterialType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PRODUCTION database seed...\n');

  // ============================================================================
  // USERS - PRODUCTION ONLY
  // ============================================================================
  console.log('👥 Creating users...');

  // PRODUCTION PASSWORDS - Change these after first login!
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

  console.log(`✅ Created ${2} production users\n`);

  // Skip sample data - users can add their own dentists, products, etc. via UI

  // ============================================================================
  // SYSTEM CONFIG
  // ============================================================================
  console.log('⚙️  Creating system configuration...');

  const dentist1 = await prisma.dentist.create({
    data: {
      clinicName: 'Dental Clinic Ljubljana Center',
      dentistName: 'Dr. Petra Zupan',
      licenseNumber: 'SLO-D-12345',
      email: 'petra.zupan@dentalclinic.si',
      phone: '+386 1 234 5678',
      address: 'Slovenska cesta 25',
      city: 'Ljubljana',
      postalCode: '1000',
      country: 'Slovenia',
      paymentTerms: 30,
    },
  });

  const dentist2 = await prisma.dentist.create({
    data: {
      clinicName: 'Smile Dental Maribor',
      dentistName: 'Dr. Jože Krajnc',
      licenseNumber: 'SLO-D-67890',
      email: 'joze.krajnc@smiledentalmaribor.si',
      phone: '+386 2 345 6789',
      address: 'Glavni trg 15',
      city: 'Maribor',
      postalCode: '2000',
      country: 'Slovenia',
      paymentTerms: 15,
      notes: 'Prefers ceramic materials, high-quality finishes',
    },
  });

  const dentist3 = await prisma.dentist.create({
    data: {
      clinicName: 'Coastal Dental Koper',
      dentistName: 'Dr. Elena Russo',
      licenseNumber: 'SLO-D-11223',
      email: 'elena.russo@coastaldental.si',
      phone: '+386 5 678 9012',
      address: 'Pristaniška ulica 8',
      city: 'Koper',
      postalCode: '6000',
      country: 'Slovenia',
      paymentTerms: 30,
    },
  });

  console.log(`✅ Created ${3} dentists\n`);

  // ============================================================================
  // PATIENTS
  // ============================================================================
  console.log('👤 Creating patients...');

  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Janez',
      lastName: 'Novak',
      dateOfBirth: new Date('1985-03-15'),
      patientCode: 'P-001',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Maja',
      lastName: 'Horvat',
      dateOfBirth: new Date('1990-07-22'),
      patientCode: 'P-002',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      firstName: 'Luka',
      lastName: 'Kranjc',
      dateOfBirth: new Date('1978-11-30'),
      patientCode: 'P-003',
    },
  });

  console.log(`✅ Created ${3} patients\n`);

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  console.log('📦 Creating products...');

  const products = [
    {
      code: 'CR-CER-001',
      name: 'Ceramic Crown',
      description: 'Full ceramic crown with high aesthetic value',
      category: ProductCategory.CROWN,
      currentPrice: 250.00,
    },
    {
      code: 'CR-MET-001',
      name: 'Metal-Ceramic Crown',
      description: 'Metal base with ceramic overlay',
      category: ProductCategory.CROWN,
      currentPrice: 180.00,
    },
    {
      code: 'CR-ZIR-001',
      name: 'Zirconia Crown',
      description: 'High-strength zirconia crown',
      category: ProductCategory.CROWN,
      currentPrice: 320.00,
    },
    {
      code: 'BR-CER-001',
      name: 'Ceramic Bridge (3-unit)',
      description: 'Three-unit ceramic bridge',
      category: ProductCategory.BRIDGE,
      currentPrice: 650.00,
    },
    {
      code: 'VE-CER-001',
      name: 'Ceramic Veneer',
      description: 'Ultra-thin ceramic veneer',
      category: ProductCategory.VENEER,
      currentPrice: 280.00,
    },
    {
      code: 'IM-TIT-001',
      name: 'Titanium Implant Crown',
      description: 'Implant-supported crown on titanium base',
      category: ProductCategory.IMPLANT,
      currentPrice: 420.00,
    },
    {
      code: 'IN-CER-001',
      name: 'Ceramic Inlay',
      description: 'Precision ceramic inlay',
      category: ProductCategory.INLAY,
      currentPrice: 150.00,
    },
    {
      code: 'ON-CER-001',
      name: 'Ceramic Onlay',
      description: 'Ceramic onlay for posterior teeth',
      category: ProductCategory.ONLAY,
      currentPrice: 180.00,
    },
    {
      code: 'DEN-ACR-001',
      name: 'Full Acrylic Denture',
      description: 'Complete upper or lower denture',
      category: ProductCategory.DENTURE,
      currentPrice: 480.00,
    },
    {
      code: 'DEN-PAR-001',
      name: 'Partial Metal Denture',
      description: 'Metal framework partial denture',
      category: ProductCategory.DENTURE,
      currentPrice: 550.00,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        currentPrice: product.currentPrice,
        priceHistory: {
          create: {
            price: product.currentPrice,
            effectiveFrom: new Date(),
            reason: 'Initial price',
          },
        },
      },
    });
  }

  console.log(`✅ Created ${products.length} products\n`);

  // ============================================================================
  // MATERIALS
  // ============================================================================
  console.log('🧪 Creating materials...');

  const materials = [
    {
      code: 'CER-001',
      name: 'IPS e.max CAD',
      type: MaterialType.CERAMIC,
      manufacturer: 'Ivoclar Vivadent',
      description: 'Lithium disilicate ceramic blocks',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0483',
      unit: 'piece',
    },
    {
      code: 'CER-002',
      name: 'VITA ENAMIC',
      type: MaterialType.CERAMIC,
      manufacturer: 'VITA Zahnfabrik',
      description: 'Hybrid ceramic material',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0297',
      unit: 'piece',
    },
    {
      code: 'ZIR-001',
      name: 'Zirkonzahn Prettau Anterior',
      type: MaterialType.ZIRCONIA,
      manufacturer: 'Zirkonzahn',
      description: 'High-translucency zirconia for anterior restorations',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-1639',
      unit: 'disc',
    },
    {
      code: 'MET-001',
      name: 'Wirobond C',
      type: MaterialType.ALLOY,
      manufacturer: 'BEGO',
      description: 'Cobalt-chromium alloy for metal frameworks',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0344',
      unit: 'gram',
    },
    {
      code: 'TIT-001',
      name: 'Grade 5 Titanium',
      type: MaterialType.TITANIUM,
      manufacturer: 'Nobel Biocare',
      description: 'Medical-grade titanium for implant abutments',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0086',
      unit: 'piece',
    },
    {
      code: 'RES-001',
      name: 'Tetric EvoCeram',
      type: MaterialType.COMPOSITE,
      manufacturer: 'Ivoclar Vivadent',
      description: 'Nano-hybrid composite resin',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0483',
      unit: 'gram',
    },
    {
      code: 'POR-001',
      name: 'IPS d.SIGN',
      type: MaterialType.PORCELAIN,
      manufacturer: 'Ivoclar Vivadent',
      description: 'Veneering porcelain for metal-ceramic restorations',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0483',
      unit: 'gram',
    },
    {
      code: 'ACR-001',
      name: 'ProBase Cold',
      type: MaterialType.ACRYLIC,
      manufacturer: 'Ivoclar Vivadent',
      description: 'Cold-curing acrylic resin for denture bases',
      biocompatible: true,
      iso10993Cert: 'ISO10993-1:2018',
      ceMarked: true,
      ceNumber: 'CE-0483',
      unit: 'gram',
    },
  ];

  const createdMaterials = [];
  for (const material of materials) {
    const created = await prisma.material.create({ data: material });
    createdMaterials.push(created);
  }

  console.log(`✅ Created ${materials.length} materials\n`);

  // ============================================================================
  // MATERIAL LOTS (Stock Arrivals)
  // ============================================================================
  console.log('📦 Creating material lots...');

  const today = new Date();
  const futureDate = new Date();
  futureDate.setFullYear(today.getFullYear() + 2);

  // Create 2-3 lots per material for FIFO testing
  const lots = [];

  for (const material of createdMaterials) {
    // Lot 1 - Older stock
    const lot1ArrivalDate = new Date();
    lot1ArrivalDate.setMonth(today.getMonth() - 3);

    lots.push({
      materialId: material.id,
      lotNumber: `LOT-${material.code}-2024-001`,
      arrivalDate: lot1ArrivalDate,
      expiryDate: new Date(lot1ArrivalDate.getFullYear() + 3, lot1ArrivalDate.getMonth(), lot1ArrivalDate.getDate()),
      supplierName: material.manufacturer,
      quantityReceived: 100,
      quantityAvailable: 65, // Partially used
    });

    // Lot 2 - Recent stock
    const lot2ArrivalDate = new Date();
    lot2ArrivalDate.setMonth(today.getMonth() - 1);

    lots.push({
      materialId: material.id,
      lotNumber: `LOT-${material.code}-2024-002`,
      arrivalDate: lot2ArrivalDate,
      expiryDate: new Date(lot2ArrivalDate.getFullYear() + 3, lot2ArrivalDate.getMonth(), lot2ArrivalDate.getDate()),
      supplierName: material.manufacturer,
      quantityReceived: 100,
      quantityAvailable: 100, // Unused
    });

    // Lot 3 - Newest stock (for some materials)
    if (createdMaterials.indexOf(material) % 2 === 0) {
      lots.push({
        materialId: material.id,
        lotNumber: `LOT-${material.code}-2025-001`,
        arrivalDate: today,
        expiryDate: futureDate,
        supplierName: material.manufacturer,
        quantityReceived: 150,
        quantityAvailable: 150,
      });
    }
  }

  for (const lot of lots) {
    await prisma.materialLot.create({ data: lot });
  }

  console.log(`✅ Created ${lots.length} material lots\n`);

  // ============================================================================
  // SYSTEM CONFIG
  // ============================================================================
  console.log('⚙️  Creating system configuration...');

  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'next_order_number',
        value: '1',
        description: 'Next sequential order number (001, 002, ...)',
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

  // ============================================================================
  // LABORATORY CONFIGURATION (for Annex XIII & Invoices)
  // ============================================================================
  console.log('🏥 Creating laboratory configuration...');

  const labConfig = await prisma.labConfiguration.create({
    data: {
      // Laboratory Information
      laboratoryName: 'Smilelab d.o.o.',
      laboratoryId: 'SI-LAB-2024-001',
      laboratoryLicense: 'ZT-SI-12345',
      registrationNumber: '1234567000',
      taxId: 'SI12345678',
      technicianIdNumber: 'ZT-12345',

      // Address
      street: 'Cesta v Mestni log 1',
      city: 'Ljubljana',
      postalCode: '1000',
      country: 'Slovenia',

      // Contact
      phone: '+386 1 234 5678',
      email: 'info@smilelab.si',
      website: 'https://www.smilelab.si',

      // Responsible Person
      responsiblePersonName: 'Dr. Ivan Novak',
      responsiblePersonTitle: 'Kvalitetni vodja / Quality Manager',
      responsiblePersonLicense: 'QM-SI-67890',
      responsiblePersonEmail: 'ivan.novak@smilelab.si',
      responsiblePersonPhone: '+386 40 123 456',

      // Settings
      defaultPaymentTerms: 30,
      defaultTaxRate: 22.00,

      updatedBy: admin.id,
    },
  });

  // Create bank accounts
  await prisma.bankAccount.createMany({
    data: [
      {
        labConfigurationId: labConfig.id,
        bankName: 'NLB d.d. Ljubljana',
        swiftBic: 'LJBASI2X',
        iban: 'SI56 0110 0100 0123 456',
        accountType: 'PRIMARY',
        isActive: true,
        isPrimary: true,
        displayOrder: 0,
      },
      {
        labConfigurationId: labConfig.id,
        bankName: 'UniCredit Banka Slovenija d.d.',
        swiftBic: 'BACXSI22',
        iban: 'SI56 2900 0000 1234 567',
        accountType: 'SECONDARY',
        isActive: true,
        isPrimary: false,
        displayOrder: 1,
      },
    ],
  });

  console.log('✅ Created laboratory configuration with 2 bank accounts\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('✅ Database seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 2 (1 admin, 1 technician)`);
  console.log(`   - Dentists: 3`);
  console.log(`   - Patients: 3`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Materials: ${materials.length}`);
  console.log(`   - Material Lots: ${lots.length}`);
  console.log(`   - System Config: 8 settings`);
  console.log(`   - Lab Configuration: 1 with 2 bank accounts\n`);

  console.log('🔑 PRODUCTION Login Credentials:');
  console.log('   Admin:       info@dentro.si / DentroAdm1n2026');
  console.log('   Technician:  3d@dentro.si / Dentro3D');
  console.log('\n⚠️  IMPORTANT: Change these passwords immediately after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
