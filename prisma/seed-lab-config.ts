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
  laboratoryName: 'DENTRO, zobozdravstvene storitve in svetovanje, d.o.o.',
  laboratoryId: '55230', // Official laboratory registration ID
  laboratoryLicense: '', // License number
  registrationNumber: '6567452000', // Business registration number (Matična številka)
  taxId: 'SI57425132', // Tax ID (Davčna številka)
  technicianIdNumber: '42555', // Technician ID/License number

  // Laboratory Address
  street: 'Podreber 14D',
  city: 'Polhov Gradec',
  postalCode: '1355',
  country: 'Slovenia',
  region: '', // Optional: region/county

  // Contact Information
  phone: '041 706 148',
  email: 'info@dentro.si',
  website: 'https://dentro.si',

  // Responsible Person (for EU MDR Annex XIII)
  responsiblePersonName: 'Rommy Balzan Verbič',
  responsiblePersonTitle: 'Odgovorni zobni tehnik', // Responsible Dental Technician
  responsiblePersonLicense: '42555', // Professional license number
  responsiblePersonEmail: 'info@dentro.si',
  responsiblePersonPhone: '041 706 148',

  // Digital Signature & Logo (file paths - upload these files first)
  signaturePath: null, // e.g., '/uploads/signature.png'
  logoPath: null, // e.g., '/uploads/logo.png'

  // Invoice Settings
  defaultPaymentTerms: 30, // Days
  defaultTaxRate: 22.00, // Slovenia VAT 22%
  invoiceLegalTerms: `Znesek računa plačajte v navedenem roku sicer bomo zaračunali zakonske zamudne obresti.

V skladu s prvim odstavkom 94.člena z DDV-1 opravljam dejavnost oproščeno obračunavanja DDV.

Izjavljam in prevzemam vso odgovornost za skladnost izdelka(ov) z bistvenimi zahtevami Pravilnika o medicinskih pripomočkih (Ur. l. RS št. 71/03).

Obveznosti za pogojnih zavez (UL) R.S. št 54/2021) ter Uredbe (UE) R.S. št 2017/745 o medicinskih pripomočkih.`
};

// Bank Accounts (can have multiple)
const BANK_ACCOUNTS = [
  {
    bankName: 'BKS Bank',
    iban: 'SI56 3500 1000 2788 759', // Full IBAN
    swiftBic: 'BFKKSI22', // SWIFT/BIC code for BKS Bank Slovenia
    accountType: 'PRIMARY', // PRIMARY, SECONDARY, EUR, USD, etc.
    isPrimary: true, // Mark as primary account for invoices
    displayOrder: 1,
    notes: 'Main business account'
  }
];

// System Configuration (key-value pairs)
const SYSTEM_CONFIG = [
  {
    key: 'company_slogan',
    value: 'Zobozdravstvene storitve in svetovanje',
    description: 'Company slogan or tagline'
  },
  {
    key: 'invoice_footer_text',
    value: 'Hvala za vaše zaupanje! / Thank you for your trust!',
    description: 'Text displayed at bottom of invoices'
  },
  {
    key: 'default_currency',
    value: 'EUR',
    description: 'Default currency for invoices'
  },
  {
    key: 'lab_code',
    value: '55230',
    description: 'Laboratory identification code'
  },
  {
    key: 'technician_code',
    value: '42555',
    description: 'Responsible technician identification code'
  },
  {
    key: 'company_representative',
    value: 'Ema Balzan',
    description: 'Company legal representative'
  }
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
