/**
 * Bulk Dentist/Clinic Import Script
 *
 * Creates multiple dentists/clinics at once from predefined data.
 * Useful for:
 * - Initial production setup
 * - After database resets
 * - Quick repopulation of customer list
 *
 * USAGE:
 * 1. Edit the DENTISTS array below with your real clinic data
 * 2. Run: npx tsx prisma/seed-dentists.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// YOUR DENTIST DATA - EDIT THIS SECTION
// ============================================================================

interface DentistData {
  clinicName: string;
  dentistName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  taxNumber?: string;
  businessRegistration?: string;
  licenseNumber?: string;
  paymentTerms?: number; // Days (default: 15)
  requiresInvoicing?: boolean; // Default: true
  notes?: string;
}

const DENTISTS: DentistData[] = [
  {
    clinicName: 'Zasebna zobna ordinacija dr. Gavran Renata',
    dentistName: 'Gavran Renata dr. dent. med.',
    email: 'dr.renata.gavran@gmail.com',
    phone: '', // Optional - add if available
    address: 'Linhartova cesta 51',
    city: 'Ljubljana',
    postalCode: '1000',
    country: 'Slovenia',
    taxNumber: '58461175', // VAT-free tax ID (numbers only) or with prefix if VAT registered
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: '0.4, 0.4, zobozdravstvene storitve d.o.o.',
    dentistName: 'Gregor Knafelc, dr.dent.med.',
    email: 'knafelc.gregor@gmail.com',
    phone: '',
    address: 'Polhov Gradec 13',
    city: 'Polhov Gradec',
    postalCode: '1355',
    country: 'Slovenia',
    taxNumber: '61349607',
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: 'EMIDENT d.o.o.',
    dentistName: 'Emiliya Naseva, dr. dent. med.',
    email: 'info@emident.si',
    phone: '',
    address: 'Vrtojbenska cesta 73',
    city: 'Šempeter pri Gorici',
    postalCode: '5290',
    country: 'Slovenia',
    taxNumber: '99309912',
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: 'PREMIODENT d.o.o.',
    dentistName: 'Maja Smerkolj, dr.dent.med.',
    email: 'premiodent@siol.net',
    phone: '',
    address: 'Malgajeva ulica 7',
    city: 'Ljubljana',
    postalCode: '1000',
    country: 'Slovenia',
    taxNumber: '74971905',
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: 'Zasebna zobnaordinacija Nuša Zadel, Dr. Dent. Med.',
    dentistName: 'Nuša Zadel, dr. dent. med.',
    email: 'info@ordinacija-zadel.si',
    phone: '',
    address: 'Slovenska cesta 17',
    city: 'Horjul',
    postalCode: '1354',
    country: 'Slovenia',
    taxNumber: '21746028',
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: 'SANI DENTAL d.o.o.',
    dentistName: 'Andrej Hudovernik dr. dent. med.',
    email: 'info@sanidental.si',
    phone: '',
    address: 'Rojska cesta 18D',
    city: 'Domžale',
    postalCode: '1230',
    country: 'Slovenia',
    taxNumber: '49988859',
    paymentTerms: 15,
    requiresInvoicing: true
  },
  {
    clinicName: 'Studio lepote Ubeauty',
    dentistName: 'Urša Trnovec s.p.',
    email: 'ursa.trnovec@ubeauty.si',
    phone: '',
    address: 'Srednja vas pri Polhovem Gradcu 4',
    city: 'Polhov Gradec',
    postalCode: '1355',
    country: 'Slovenia',
    taxNumber: '43542492',
    paymentTerms: 15,
    requiresInvoicing: true,
    notes: 'Office rental client - beauty studio'
  },
  // Internal dentists - no invoicing required
  {
    clinicName: 'Hiša Lepega Nasmeha PG - Dentro d.o.o.',
    dentistName: 'Sara Vivoda dr.dent.med.',
    email: 'sara.vivoda@dentro.si',
    phone: '041 706 148',
    address: 'Podrebed 14D',
    city: 'Polhov Gradec',
    postalCode: '1355',
    country: 'Slovenia',
    taxNumber: '57425132',
    paymentTerms: 0, // Internal work - no payment terms needed
    requiresInvoicing: false,
    notes: 'Internal dentist - no invoicing required'
  },
  {
    clinicName: 'Hiša Lepega Nasmeha PG - Dentro d.o.o.',
    dentistName: 'Primož Gregorčič dr.dent.med.',
    email: 'primoz.gregorcic@dentro.si',
    phone: '041 706 148',
    address: 'Podrebed 14D',
    city: 'Polhov Gradec',
    postalCode: '1355',
    country: 'Slovenia',
    taxNumber: '57425132',
    paymentTerms: 0, // Internal work - no payment terms needed
    requiresInvoicing: false,
    notes: 'Internal dentist - no invoicing required'
  }
];

// ============================================================================
// SCRIPT LOGIC - DON'T EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
// ============================================================================

async function seedDentists() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏥 Bulk Dentist Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📊 Found ${DENTISTS.length} dentists to import...\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const dentistData of DENTISTS) {
    try {
      // Check if dentist already exists (by email)
      const existing = await prisma.dentist.findFirst({
        where: { email: dentistData.email }
      });

      if (existing) {
        // Update existing dentist
        await prisma.dentist.update({
          where: { id: existing.id },
          data: {
            clinicName: dentistData.clinicName,
            dentistName: dentistData.dentistName,
            phone: dentistData.phone,
            address: dentistData.address,
            city: dentistData.city,
            postalCode: dentistData.postalCode,
            country: dentistData.country || 'Slovenia',
            taxNumber: dentistData.taxNumber,
            businessRegistration: dentistData.businessRegistration,
            licenseNumber: dentistData.licenseNumber,
            paymentTerms: dentistData.paymentTerms || 15,
            requiresInvoicing: dentistData.requiresInvoicing !== undefined ? dentistData.requiresInvoicing : true,
            notes: dentistData.notes,
            active: true
          }
        });
        console.log(`   ✅ Updated: ${dentistData.clinicName} (${dentistData.email})`);
        updated++;
      } else {
        // Create new dentist
        await prisma.dentist.create({
          data: {
            clinicName: dentistData.clinicName,
            dentistName: dentistData.dentistName,
            email: dentistData.email,
            phone: dentistData.phone,
            address: dentistData.address,
            city: dentistData.city,
            postalCode: dentistData.postalCode,
            country: dentistData.country || 'Slovenia',
            taxNumber: dentistData.taxNumber,
            businessRegistration: dentistData.businessRegistration,
            licenseNumber: dentistData.licenseNumber,
            paymentTerms: dentistData.paymentTerms || 15,
            requiresInvoicing: dentistData.requiresInvoicing !== undefined ? dentistData.requiresInvoicing : true,
            notes: dentistData.notes,
            active: true
          }
        });
        console.log(`   ✅ Created: ${dentistData.clinicName} (${dentistData.email})`);
        created++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${dentistData.clinicName} - ${error}`);
      skipped++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Import Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Summary:');
  console.log(`   • ${created} dentists created`);
  console.log(`   • ${updated} dentists updated`);
  console.log(`   • ${skipped} errors/skipped\n`);

  // Show all dentists in database
  const allDentists = await prisma.dentist.findMany({
    where: { active: true },
    orderBy: { clinicName: 'asc' }
  });

  console.log(`📋 Total active dentists in database: ${allDentists.length}\n`);

  allDentists.forEach((dentist, index) => {
    console.log(`   ${index + 1}. ${dentist.clinicName} - ${dentist.dentistName}`);
    console.log(`      📧 ${dentist.email}`);
    console.log(`      📞 ${dentist.phone}`);
    console.log(`      📍 ${dentist.address}, ${dentist.city} ${dentist.postalCode}`);
    if (dentist.notes) {
      console.log(`      📝 ${dentist.notes}`);
    }
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the import
seedDentists()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
