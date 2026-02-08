/**
 * Lab Configuration & Settings Seed Script
 *
 * Populates laboratory configuration, bank accounts, and system settings.
 * Useful for:
 * - Initial production setup
 * - After database resets
 * - Updating company information
 *
 * USAGE:
 * 1. Edit the configuration data below
 * 2. Run: npx tsx prisma/seed-lab-config.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// LAB CONFIGURATION DATA - EDIT THIS SECTION
// ============================================================================

const LAB_CONFIG = {
  // Laboratory Information
  laboratoryName: 'Your Lab Name d.o.o.',
  laboratoryId: '', // Official laboratory registration ID
  laboratoryLicense: '', // License number
  registrationNumber: '', // Business registration number (Matična številka)
  taxId: '', // Tax ID (Davčna številka) - format: SIXXXXXXXX
  technicianIdNumber: '', // Technician ID/License number

  // Laboratory Address
  street: 'Your Street Address',
  city: 'Your City',
  postalCode: '0000',
  country: 'Slovenia',
  region: '', // Optional: region/county

  // Contact Information
  phone: '+386 X XXX XXXX',
  email: 'info@yourlab.si',
  website: 'https://www.yourlab.si',

  // Responsible Person (for EU MDR Annex XIII)
  responsiblePersonName: 'Your Name',
  responsiblePersonTitle: 'Quality Manager', // e.g., "Kvalitetni vodja" / "Quality Manager"
  responsiblePersonLicense: '', // Professional license number
  responsiblePersonEmail: 'responsible@yourlab.si',
  responsiblePersonPhone: '+386 X XXX XXXX',

  // Digital Signature & Logo (file paths - upload these files first)
  signaturePath: null, // e.g., '/uploads/signature.png'
  logoPath: null, // e.g., '/uploads/logo.png'

  // Invoice Settings
  defaultPaymentTerms: 30, // Days
  defaultTaxRate: 22.00, // Slovenia VAT 22%
  invoiceLegalTerms: `Payment terms: 30 days from invoice date.
Late payments subject to statutory interest.
Goods remain property of laboratory until full payment received.`
};

// Bank Accounts (can have multiple)
const BANK_ACCOUNTS = [
  {
    bankName: 'NLB d.d.',
    iban: 'SI56 XXXX XXXX XXXX XXX', // Full IBAN
    swiftBic: 'LJBASI2X', // SWIFT/BIC code
    accountType: 'PRIMARY', // PRIMARY, SECONDARY, EUR, USD, etc.
    isPrimary: true, // Mark as primary account for invoices
    displayOrder: 1,
    notes: 'Main business account'
  },
  // Add more bank accounts if needed
  // {
  //   bankName: 'UniCredit Banka Slovenija d.d.',
  //   iban: 'SI56 XXXX XXXX XXXX XXX',
  //   swiftBic: 'BACXSI22',
  //   accountType: 'SECONDARY',
  //   isPrimary: false,
  //   displayOrder: 2,
  //   notes: 'Secondary account'
  // }
];

// System Configuration (key-value pairs)
const SYSTEM_CONFIG = [
  {
    key: 'company_slogan',
    value: 'Your company slogan here',
    description: 'Company slogan or tagline'
  },
  {
    key: 'invoice_footer_text',
    value: 'Thank you for your business!',
    description: 'Text displayed at bottom of invoices'
  },
  {
    key: 'default_currency',
    value: 'EUR',
    description: 'Default currency for invoices'
  },
  // Add more custom settings as needed
];

// ============================================================================
// SCRIPT LOGIC - DON'T EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
// ============================================================================

async function seedLabConfig() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  Lab Configuration & Settings Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Create or Update Lab Configuration
    console.log('📋 Step 1: Setting up lab configuration...\n');

    // Check if lab config already exists
    const existingConfig = await prisma.labConfiguration.findFirst();

    let labConfig;
    if (existingConfig) {
      // Update existing config
      labConfig = await prisma.labConfiguration.update({
        where: { id: existingConfig.id },
        data: LAB_CONFIG
      });
      console.log('   ✅ Lab configuration updated\n');
    } else {
      // Create new config
      labConfig = await prisma.labConfiguration.create({
        data: LAB_CONFIG
      });
      console.log('   ✅ Lab configuration created\n');
    }

    // Step 2: Create or Update Bank Accounts
    console.log('📋 Step 2: Setting up bank accounts...\n');

    // Delete existing bank accounts for this lab config
    await prisma.bankAccount.deleteMany({
      where: { labConfigurationId: labConfig.id }
    });

    // Create new bank accounts
    for (const bankData of BANK_ACCOUNTS) {
      await prisma.bankAccount.create({
        data: {
          ...bankData,
          labConfigurationId: labConfig.id,
          isActive: true
        }
      });
      console.log(`   ✅ Bank account added: ${bankData.bankName} (${bankData.iban})`);
    }
    console.log('');

    // Step 3: Create or Update System Configuration
    console.log('📋 Step 3: Setting up system configuration...\n');

    for (const config of SYSTEM_CONFIG) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          description: config.description
        },
        create: config
      });
      console.log(`   ✅ System config set: ${config.key}`);
    }
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Configuration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Lab Configuration:');
    console.log(`   • Laboratory: ${labConfig.laboratoryName}`);
    console.log(`   • Address: ${labConfig.street}, ${labConfig.postalCode} ${labConfig.city}`);
    console.log(`   • Email: ${labConfig.email}`);
    console.log(`   • Phone: ${labConfig.phone}`);
    console.log(`   • Tax ID: ${labConfig.taxId}`);
    console.log(`   • Responsible Person: ${labConfig.responsiblePersonName} (${labConfig.responsiblePersonTitle})\n`);

    console.log('💳 Bank Accounts:');
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { labConfigurationId: labConfig.id },
      orderBy: { displayOrder: 'asc' }
    });
    bankAccounts.forEach((bank, index) => {
      console.log(`   ${index + 1}. ${bank.bankName}`);
      console.log(`      IBAN: ${bank.iban}`);
      console.log(`      SWIFT: ${bank.swiftBic}`);
      console.log(`      Type: ${bank.accountType}${bank.isPrimary ? ' (PRIMARY)' : ''}`);
    });
    console.log('');

    console.log('⚙️  System Configuration:');
    const allConfigs = await prisma.systemConfig.findMany();
    allConfigs.forEach((config) => {
      console.log(`   • ${config.key}: ${config.value}`);
    });
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Configuration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
seedLabConfig()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
