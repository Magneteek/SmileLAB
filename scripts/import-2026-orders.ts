/**
 * Import 2026 orders from CSV data
 * Run: npx ts-node scripts/import-2026-orders.ts
 *
 * Creates 48 orders starting from 26003, sorted by order date.
 * Worksheets will be created manually via the UI.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DENTIST SEARCH TERMS
// dentistName and/or clinicName must both match if provided (AND logic)
// ============================================================================
const DENTIST_SEARCH: Record<string, { dentistName?: string; clinicName?: string }> = {
  'Gregor Knafelc':             { dentistName: 'Knafelc' },
  'Hiša lepega nasmeha SARA':   { dentistName: 'Sara Vivoda', clinicName: 'Hiša' },
  'Hiša lepega nasmeha PRIMOŽ': { dentistName: 'Primož' },
  'Nuša Zadel':                 { dentistName: 'Zadel' },
  'Emident Emilya Naseva':      { clinicName: 'EMIDENT' },
  'PREMIODENT':                 { clinicName: 'PREMIODENT' },
};

// ============================================================================
// CSV DATA
// ============================================================================
// Format: [dentist, patient, orderDate (D. M. YYYY), dueDate, invoiceRef]
const RAW_DATA: [string, string, string, string, string][] = [
  ['Gregor Knafelc',             'Janko Švarc',            '8. 1. 2026',  '5. 2. 2026',  'RAC-2026-003'],
  ['Hiša lepega nasmeha SARA',   'Maja Radulovič',         '13. 1. 2026', '22. 1. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Sebastjan Cvetaš',       '13. 1. 2026', '16. 1. 2026', 'Interno'],
  ['Nuša Zadel',                 'Ivana Nagode',           '15. 1. 2026', '5. 2. 2026',  'RAC-2026-002'],
  ['Emident Emilya Naseva',      'Adriano Maggio',         '15. 1. 2026', '10. 2. 2026', 'RAC-2026-004'],
  ['Hiša lepega nasmeha SARA',   'Lucija Malovrh',         '19. 1. 2026', '19. 1. 2026', 'Interno'],
  ['Nuša Zadel',                 'Matevž Vrhovec',         '19. 1. 2026', '5. 2. 2026',  'RAC-2026-002'],
  ['Gregor Knafelc',             'Danica Bergant',         '20. 1. 2026', '5. 2. 2026',  'RAC-2026-003'],
  ['PREMIODENT',                 'Jure Stržaj',            '21. 1. 2026', '28. 1. 2026', 'brez'],
  ['Nuša Zadel',                 'Drago Burja',            '21. 1. 2026', '5. 2. 2026',  'RAC-2026-002'],
  ['Gregor Knafelc',             'Maya Purič',             '21. 1. 2026', '5. 2. 2026',  'RAC-2026-003'],
  ['Hiša lepega nasmeha SARA',   'Klementina Kastelic',    '22. 1. 2026', '30. 1. 2026', 'Interno'],
  ['Nuša Zadel',                 'Darja Gabrovšek',        '22. 1. 2026', '5. 2. 2026',  'RAC-2026-002'],
  ['Hiša lepega nasmeha SARA',   'Franci Lampret',         '27. 1. 2026', '28. 1. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Matjaž Šuligoj',         '30. 1. 2026', '3. 2. 2026',  'Interno'],
  ['Gregor Knafelc',             'Urška Sušnik',           '2. 2. 2026',  '5. 2. 2026',  'RAC-2026-003'],
  ['Hiša lepega nasmeha PRIMOŽ', 'Veronika Jereb',         '3. 2. 2026',  '5. 2. 2026',  'Interno'],
  ['Emident Emilya Naseva',      'Teja Mežek',             '3. 2. 2026',  '13. 2. 2026', 'RAC-2026-004'],
  ['PREMIODENT',                 'Dušan Moravec',          '4. 2. 2026',  '4. 2. 2026',  'brez'],
  ['Hiša lepega nasmeha SARA',   'Silva Cankar',           '5. 2. 2026',  '13. 2. 2026', 'Interno'],
  ['Nuša Zadel',                 'Franc Medved',           '5. 2. 2026',  '5. 2. 2026',  'RAC-2026-002'],
  ['Emident Emilya Naseva',      'Nataša Reščič',          '6. 2. 2026',  '17. 2. 2026', 'brez'],
  ['Emident Emilya Naseva',      'Tatjana Ivanova',        '6. 2. 2026',  '16. 2. 2026', 'brez'],
  ['Gregor Knafelc',             'Mojca Marolt',           '11. 2. 2026', '19. 2. 2026', 'brez'],
  ['Emident Emilya Naseva',      'Jožica Čačič',           '13. 2. 2026', '19. 2. 2026', 'brez'],
  ['Emident Emilya Naseva',      'Elisabeta Pascolat',     '13. 2. 2026', '24. 2. 2026', 'brez'],
  ['Gregor Knafelc',             'Tamara Ventriglia',      '17. 2. 2026', '19. 2. 2026', 'brez'],
  ['Hiša lepega nasmeha SARA',   'Katarina Štebe',         '17. 2. 2026', '19. 2. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Milena Krvina',          '19. 2. 2026', '19. 2. 2026', 'Interno'],
  ['Gregor Knafelc',             'Mojca Marolt',           '24. 2. 2026', '2. 3. 2026',  'brez'],
  ['Nuša Zadel',                 'Anja Nadlišek',          '24. 2. 2026', '3. 3. 2026',  'brez'],
  ['Hiša lepega nasmeha SARA',   'Marija Dolenec',         '24. 2. 2026', '26. 2. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Silva Cankar',           '24. 2. 2026', '27. 2. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Sonja Sečnik',           '24. 2. 2026', '3. 3. 2026',  'Interno'],
  ['Hiša lepega nasmeha SARA',   'Ivan Peklaj',            '24. 2. 2026', '9. 3. 2026',  'Interno'],
  ['PREMIODENT',                 'Dušan Moravec',          '25. 2. 2026', '18. 3. 2026', 'brez'],
  ['Hiša lepega nasmeha PRIMOŽ', 'Marko Peklaj',           '26. 2. 2026', '3. 3. 2026',  'Interno'],
  ['Gregor Knafelc',             'Matej Trnovec',          '2. 3. 2026',  '10. 3. 2026', 'brez'],
  ['Hiša lepega nasmeha PRIMOŽ', 'Marina Djorjevič',       '3. 3. 2026',  '10. 3. 2026', 'Interno'],
  ['Hiša lepega nasmeha PRIMOŽ', 'Marina Djorjevič',       '3. 3. 2026',  '19. 3. 2026', 'Interno'],
  ['Nuša Zadel',                 'Antonija Bastarda',      '6. 3. 2026',  '17. 3. 2026', 'brez'],
  ['Hiša lepega nasmeha SARA',   'Damjana Sotlar',         '6. 3. 2026',  '13. 3. 2026', 'Interno'],
  ['Gregor Knafelc',             'Marko Bizjan',           '10. 3. 2026', '17. 3. 2026', 'brez'],
  ['Hiša lepega nasmeha SARA',   'Fani Baudaci',           '12. 3. 2026', '24. 3. 2026', 'Interno'],
  ['Nuša Zadel',                 'Ivan Leskovec',          '13. 3. 2026', '26. 3. 2026', 'brez'],
  ['Hiša lepega nasmeha PRIMOŽ', 'Renato Sterle',          '17. 3. 2026', '24. 3. 2026', 'Interno'],
  ['Hiša lepega nasmeha SARA',   'Karmen Škof',            '17. 3. 2026', '17. 3. 2026', 'Interno'],
  ['PREMIODENT',                 'Tea Judnič',             '19. 3. 2026', '19. 3. 2026', 'brez'],
];

// ============================================================================
// HELPERS
// ============================================================================

function parseSlDate(str: string): Date {
  // "8. 1. 2026" → Date
  const parts = str.trim().split('.');
  const day = parseInt(parts[0].trim());
  const month = parseInt(parts[1].trim()) - 1; // 0-indexed
  const year = parseInt(parts[2].trim());
  return new Date(year, month, day, 12, 0, 0); // noon to avoid TZ edge cases
}

function pad(n: number, width: number = 5): string {
  return String(n).padStart(width, '0');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('Starting 2026 order import...\n');

  // Resolve all dentists dynamically by name search
  const allDentists = await prisma.dentist.findMany({
    select: { id: true, dentistName: true, clinicName: true },
  });

  const dentistIdMap: Record<string, string> = {};
  console.log('Resolving dentists:');
  for (const [csvName, search] of Object.entries(DENTIST_SEARCH)) {
    const match = allDentists.find((d) => {
      const nameOk = !search.dentistName || d.dentistName.toLowerCase().includes(search.dentistName.toLowerCase());
      const clinicOk = !search.clinicName || d.clinicName.toLowerCase().includes(search.clinicName.toLowerCase());
      return nameOk && clinicOk;
    });
    if (match) {
      dentistIdMap[csvName] = match.id;
      console.log(`  ✅ "${csvName}" → ${match.dentistName} (${match.clinicName})`);
    } else {
      console.error(`  ❌ No match found for "${csvName}" (search: ${JSON.stringify(search)})`);
    }
  }

  const unresolved = Object.keys(DENTIST_SEARCH).filter((k) => !dentistIdMap[k]);
  if (unresolved.length > 0) {
    console.error(`\n❌ Cannot proceed — unresolved dentists: ${unresolved.join(', ')}`);
    process.exit(1);
  }

  // Resolve admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, name: true } });
  if (!admin) {
    console.error('❌ No ADMIN user found');
    process.exit(1);
  }
  console.log(`\nAdmin user: ${admin.name} (${admin.id})`);

  // Get current max order number
  const lastOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let counter = lastOrder ? parseInt(lastOrder.orderNumber) + 1 : 26001;
  console.log(`Starting order numbers from: ${counter}\n`);

  let created = 0;
  let skipped = 0;

  for (const [dentistKey, patientName, orderDateStr, dueDateStr, invoiceRef] of RAW_DATA) {
    const dentistId = dentistIdMap[dentistKey];
    if (!dentistId) {
      console.warn(`⚠️  Unknown dentist: "${dentistKey}" — skipping ${patientName}`);
      skipped++;
      continue;
    }

    const orderNumber = pad(counter);
    const orderDate = parseSlDate(orderDateStr);
    const dueDate = parseSlDate(dueDateStr);
    const notes = invoiceRef !== 'brez' && invoiceRef !== 'Interno'
      ? `Račun: ${invoiceRef}`
      : invoiceRef === 'Interno' ? 'Interno' : undefined;

    try {
      await prisma.order.create({
        data: {
          orderNumber,
          dentistId,
          createdById: admin.id,
          patientName,
          orderDate,
          dueDate,
          status: 'PENDING',
          notes: notes ?? null,
        },
      });

      console.log(`✅ ${orderNumber} | ${orderDateStr.padEnd(12)} | ${dentistKey.padEnd(28)} | ${patientName} ${invoiceRef !== 'brez' ? `(${invoiceRef})` : ''}`);
      created++;
      counter++;
    } catch (error: any) {
      console.error(`❌ Failed to create order for ${patientName}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
