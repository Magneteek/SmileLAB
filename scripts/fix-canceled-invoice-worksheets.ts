/**
 * Fix Canceled Invoice Worksheets Script
 *
 * This script fixes worksheets that are stuck in INVOICED status
 * due to canceled invoices (before the status reversion fix was implemented).
 *
 * Run with: npx tsx scripts/fix-canceled-invoice-worksheets.ts
 */

import { PrismaClient, WorksheetStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding worksheets with canceled invoices...\n');

  // Find all worksheets that are DELIVERED but only have CANCELLED invoices
  // Note: INVOICED status was removed from schema, now using DELIVERED
  const affectedWorksheets = await prisma.workSheet.findMany({
    where: {
      status: WorksheetStatus.DELIVERED,
    },
    include: {
      invoiceLineItems: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              paymentStatus: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${affectedWorksheets.length} worksheets in INVOICED status\n`);

  // Filter to only worksheets where ALL invoices are cancelled
  const worksheetsToFix = affectedWorksheets.filter((ws) => {
    const invoices = ws.invoiceLineItems.map((ili) => ili.invoice);
    const allCancelled = invoices.every((inv) => inv.paymentStatus === 'CANCELLED');
    return allCancelled && invoices.length > 0;
  });

  if (worksheetsToFix.length === 0) {
    console.log('✅ No worksheets need fixing. All good!');
    return;
  }

  console.log(`📋 Found ${worksheetsToFix.length} worksheet(s) to fix:\n`);

  worksheetsToFix.forEach((ws, index) => {
    const invoiceNumbers = ws.invoiceLineItems
      .map((ili) => ili.invoice.invoiceNumber)
      .join(', ');
    console.log(
      `${index + 1}. Worksheet ${ws.worksheetNumber} (ID: ${ws.id})`
    );
    console.log(`   Canceled invoices: ${invoiceNumbers}\n`);
  });

  // Ask for confirmation (in real usage, you might want to use readline)
  console.log('🔧 Updating worksheet statuses to QC_APPROVED...\n');

  // Update all affected worksheets
  const result = await prisma.workSheet.updateMany({
    where: {
      id: {
        in: worksheetsToFix.map((ws) => ws.id),
      },
    },
    data: {
      status: WorksheetStatus.QC_APPROVED,
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Updated ${result.count} worksheet(s) to QC_APPROVED status\n`);

  // Show updated worksheets
  console.log('📊 Updated worksheets:');
  worksheetsToFix.forEach((ws, index) => {
    console.log(
      `${index + 1}. ${ws.worksheetNumber}: INVOICED → QC_APPROVED ✓`
    );
  });

  console.log('\n✨ Done! Worksheets are now available for re-invoicing.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
