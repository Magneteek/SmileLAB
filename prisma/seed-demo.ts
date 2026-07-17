/**
 * Demo/Staging Seed Script
 *
 * Seeds setup data only — laboratory configuration, price list (products),
 * materials + LOTs, and dentists. Deliberately does NOT create patients,
 * orders, worksheets, or invoices, so a demo instance still looks
 * ready-to-use without fabricating fake clinical workflow history.
 *
 * Intended for a demo/staging instance that already has its admin user
 * created separately. Safe to point at any DATABASE_URL — aborts if the
 * target already has dentists or products, to avoid double-seeding.
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx prisma/seed-demo.ts
 */

import { PrismaClient, ProductCategory, MaterialType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo setup data (lab config, dentists, price list, materials)...\n');

  const existingDentists = await prisma.dentist.count();
  const existingProducts = await prisma.product.count();
  if (existingDentists > 0 || existingProducts > 0) {
    console.log(`⚠️  Target database already has ${existingDentists} dentist(s) and ${existingProducts} product(s).`);
    console.log('Aborting to avoid double-seeding. Delete existing data first if you want to reseed.');
    process.exit(1);
  }

  // ============================================================================
  // LABORATORY CONFIGURATION
  // ============================================================================
  console.log('🏥 Creating laboratory configuration...');

  const labConfig = await prisma.labConfiguration.create({
    data: {
      laboratoryName: 'Smilelab d.o.o.',
      laboratoryId: 'SI-LAB-2024-001',
      laboratoryLicense: 'ZT-SI-12345',
      registrationNumber: '1234567000',
      taxId: '12345678',
      technicianIdNumber: 'ZT-12345',

      street: 'Cesta v Mestni log 1',
      city: 'Ljubljana',
      postalCode: '1000',
      country: 'Slovenia',

      phone: '+386 1 234 5678',
      email: 'info@smilelab.si',
      website: 'https://www.smilelab.si',

      responsiblePersonName: 'Dr. Ivan Novak',
      responsiblePersonTitle: 'Kvalitetni vodja / Quality Manager',
      responsiblePersonLicense: 'QM-SI-67890',
      responsiblePersonEmail: 'ivan.novak@smilelab.si',
      responsiblePersonPhone: '+386 40 123 456',

      defaultPaymentTerms: 30,
      defaultTaxRate: 22.0,
    },
  });

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
  // DENTISTS
  // ============================================================================
  console.log('🦷 Creating dentists...');

  await prisma.dentist.createMany({
    data: [
      {
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
      {
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
      {
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
    ],
  });

  console.log('✅ Created 3 dentists\n');

  // ============================================================================
  // PRODUCTS (PRICE LIST)
  // ============================================================================
  console.log('📦 Creating price list...');

  const products = [
    { code: 'CR-CER-001', name: 'Ceramic Crown', description: 'Full ceramic crown with high aesthetic value', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 250.0 },
    { code: 'CR-MET-001', name: 'Metal-Ceramic Crown', description: 'Metal base with ceramic overlay', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 180.0 },
    { code: 'CR-ZIR-001', name: 'Zirconia Crown', description: 'High-strength zirconia crown', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 320.0 },
    { code: 'BR-CER-001', name: 'Ceramic Bridge (3-unit)', description: 'Three-unit ceramic bridge', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 650.0 },
    { code: 'VE-CER-001', name: 'Ceramic Veneer', description: 'Ultra-thin ceramic veneer', category: ProductCategory.ESTETIKA, currentPrice: 280.0 },
    { code: 'IM-TIT-001', name: 'Titanium Implant Crown', description: 'Implant-supported crown on titanium base', category: ProductCategory.IMPLANTOLOGIJA, currentPrice: 420.0 },
    { code: 'IN-CER-001', name: 'Ceramic Inlay', description: 'Precision ceramic inlay', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 150.0 },
    { code: 'ON-CER-001', name: 'Ceramic Onlay', description: 'Ceramic onlay for posterior teeth', category: ProductCategory.FIKSNA_PROTETIKA, currentPrice: 180.0 },
    { code: 'DEN-ACR-001', name: 'Full Acrylic Denture', description: 'Complete upper or lower denture', category: ProductCategory.SNEMNA_PROTETIKA, currentPrice: 480.0 },
    { code: 'DEN-PAR-001', name: 'Partial Metal Denture', description: 'Metal framework partial denture', category: ProductCategory.SNEMNA_PROTETIKA, currentPrice: 550.0 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
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
  // MATERIALS + LOTS
  // ============================================================================
  console.log('🧪 Creating materials...');

  const materials = [
    { code: 'CER-001', name: 'IPS e.max CAD', type: MaterialType.CERAMIC, manufacturer: 'Ivoclar Vivadent', description: 'Lithium disilicate ceramic blocks', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0483', unit: 'piece' },
    { code: 'CER-002', name: 'VITA ENAMIC', type: MaterialType.CERAMIC, manufacturer: 'VITA Zahnfabrik', description: 'Hybrid ceramic material', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0297', unit: 'piece' },
    { code: 'ZIR-001', name: 'Zirkonzahn Prettau Anterior', type: MaterialType.ZIRCONIA, manufacturer: 'Zirkonzahn', description: 'High-translucency zirconia for anterior restorations', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-1639', unit: 'disc' },
    { code: 'MET-001', name: 'Wirobond C', type: MaterialType.ALLOY, manufacturer: 'BEGO', description: 'Cobalt-chromium alloy for metal frameworks', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0344', unit: 'gram' },
    { code: 'TIT-001', name: 'Grade 5 Titanium', type: MaterialType.TITANIUM, manufacturer: 'Nobel Biocare', description: 'Medical-grade titanium for implant abutments', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0086', unit: 'piece' },
    { code: 'RES-001', name: 'Tetric EvoCeram', type: MaterialType.COMPOSITE, manufacturer: 'Ivoclar Vivadent', description: 'Nano-hybrid composite resin', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0483', unit: 'gram' },
    { code: 'POR-001', name: 'IPS d.SIGN', type: MaterialType.PORCELAIN, manufacturer: 'Ivoclar Vivadent', description: 'Veneering porcelain for metal-ceramic restorations', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0483', unit: 'gram' },
    { code: 'ACR-001', name: 'ProBase Cold', type: MaterialType.ACRYLIC, manufacturer: 'Ivoclar Vivadent', description: 'Cold-curing acrylic resin for denture bases', iso10993Cert: 'ISO10993-1:2018', ceNumber: 'CE-0483', unit: 'gram' },
  ];

  const createdMaterials = [];
  for (const material of materials) {
    const created = await prisma.material.create({
      data: { ...material, biocompatible: true, ceMarked: true },
    });
    createdMaterials.push(created);
  }

  console.log(`✅ Created ${materials.length} materials\n`);

  console.log('📦 Creating material LOTs (stock arrivals)...');

  const today = new Date();
  const futureDate = new Date();
  futureDate.setFullYear(today.getFullYear() + 2);

  const lots = [];
  for (const [index, material] of createdMaterials.entries()) {
    const lot1ArrivalDate = new Date();
    lot1ArrivalDate.setMonth(today.getMonth() - 3);
    lots.push({
      materialId: material.id,
      lotNumber: `LOT-${material.code}-2025-001`,
      arrivalDate: lot1ArrivalDate,
      expiryDate: new Date(lot1ArrivalDate.getFullYear() + 3, lot1ArrivalDate.getMonth(), lot1ArrivalDate.getDate()),
      supplierName: material.manufacturer,
      quantityReceived: 100,
      quantityAvailable: 65,
    });

    const lot2ArrivalDate = new Date();
    lot2ArrivalDate.setMonth(today.getMonth() - 1);
    lots.push({
      materialId: material.id,
      lotNumber: `LOT-${material.code}-2025-002`,
      arrivalDate: lot2ArrivalDate,
      expiryDate: new Date(lot2ArrivalDate.getFullYear() + 3, lot2ArrivalDate.getMonth(), lot2ArrivalDate.getDate()),
      supplierName: material.manufacturer,
      quantityReceived: 100,
      quantityAvailable: 100,
    });

    if (index % 2 === 0) {
      lots.push({
        materialId: material.id,
        lotNumber: `LOT-${material.code}-2026-001`,
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

  console.log('✅ Demo seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Lab Configuration: 1 (Smilelab d.o.o.) with 2 bank accounts`);
  console.log(`   - Dentists: 3`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Materials: ${materials.length}`);
  console.log(`   - Material Lots: ${lots.length}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
