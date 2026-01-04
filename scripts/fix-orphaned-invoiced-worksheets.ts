/**
 * Fix Orphaned Invoiced Worksheets Script
 *
 * This script fixes worksheets that are stuck in INVOICED status due to:
 * 1. Deleted canceled invoices (invoice was deleted before worksheet reversion fix)
 * 2. Canceled invoices that weren't reverted (before the cancelInvoice fix)
 *
 * Run with: npx tsx scripts/fix-orphaned-invoiced-worksheets.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding worksheets stuck in INVOICED status...\n');

  // Find all worksheets that are INVOICED
  const invoicedWorksheets = await prisma.workSheet.findMany({
    where: {
      status: 'INVOICED',
    },
    select: {
      id: true,
      worksheetNumber: true,
      orderId: true,
      invoiceLineItems: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              paymentStatus: true,
              isDraft: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${invoicedWorksheets.length} worksheets in INVOICED status\n`);

  // Categorize worksheets
  const orphanedWorksheets: typeof invoicedWorksheets = [];
  const canceledInvoiceWorksheets: typeof invoicedWorksheets = [];
  const validInvoicedWorksheets: typeof invoicedWorksheets = [];

  for (const ws of invoicedWorksheets) {
    const invoices = ws.invoiceLineItems.map((ili) => ili.invoice);

    if (invoices.length === 0) {
      // No invoices at all (deleted or orphaned)
      orphanedWorksheets.push(ws);
    } else {
      const hasActiveInvoice = invoices.some(
        (inv) => inv.paymentStatus !== 'CANCELLED' && !inv.isDraft
      );

      if (!hasActiveInvoice) {
        // Only has canceled or draft invoices
        canceledInvoiceWorksheets.push(ws);
      } else {
        // Has at least one active invoice (should stay INVOICED)
        validInvoicedWorksheets.push(ws);
      }
    }
  }

  console.log('📊 Categorization Results:');
  console.log(`  - Orphaned (no invoices): ${orphanedWorksheets.length}`);
  console.log(`  - Canceled invoices only: ${canceledInvoiceWorksheets.length}`);
  console.log(`  - Valid (has active invoice): ${validInvoicedWorksheets.length}\n`);

  // Combine worksheets to fix
  const worksheetsToFix = [...orphanedWorksheets, ...canceledInvoiceWorksheets];

  if (worksheetsToFix.length === 0) {
    console.log('✅ No worksheets need fixing. All good!');
    return;
  }

  console.log(`📋 Found ${worksheetsToFix.length} worksheet(s) to fix:\n`);

  worksheetsToFix.forEach((ws, index) => {
    const invoiceInfo =
      ws.invoiceLineItems.length === 0
        ? 'No invoices (orphaned)'
        : `Canceled/Draft invoices: ${ws.invoiceLineItems
            .map((ili) => ili.invoice.invoiceNumber || 'DRAFT')
            .join(', ')}`;

    console.log(`${index + 1}. Worksheet ${ws.worksheetNumber} (ID: ${ws.id})`);
    console.log(`   Status: ${invoiceInfo}\n`);
  });

  // Ask for confirmation
  console.log('🔧 Updating worksheet and order statuses to QC_APPROVED...\n');

  // Get order IDs from worksheets
  const orderIds = worksheetsToFix
    .filter((ws) => ws.orderId)
    .map((ws) => ws.orderId!);

  // Update all affected worksheets and orders in transaction
  await prisma.$transaction(async (tx) => {
    // Update worksheets
    const worksheetResult = await tx.workSheet.updateMany({
      where: {
        id: {
          in: worksheetsToFix.map((ws) => ws.id),
        },
      },
      data: {
        status: 'QC_APPROVED',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Updated ${worksheetResult.count} worksheet(s) to QC_APPROVED status`);

    // Update orders
    if (orderIds.length > 0) {
      const orderResult = await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          status: 'INVOICED', // Only update if currently INVOICED
        },
        data: {
          status: 'QC_APPROVED',
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Updated ${orderResult.count} order(s) to QC_APPROVED status`);
    }
  });

  console.log();

  // Show updated worksheets
  console.log('📊 Updated worksheets:');
  worksheetsToFix.forEach((ws, index) => {
    console.log(`${index + 1}. ${ws.worksheetNumber}: INVOICED → QC_APPROVED ✓`);
  });

  console.log('\n✨ Done! Worksheets are now available for re-invoicing.');

  // Show summary of valid invoiced worksheets (not changed)
  if (validInvoicedWorksheets.length > 0) {
    console.log(`\n📌 Note: ${validInvoicedWorksheets.length} worksheet(s) remain in INVOICED status (they have active invoices):`);
    validInvoicedWorksheets.forEach((ws) => {
      const activeInvoice = ws.invoiceLineItems.find(
        (ili) => ili.invoice.paymentStatus !== 'CANCELLED' && !ili.invoice.isDraft
      );
      console.log(`  - ${ws.worksheetNumber}: Invoice ${activeInvoice?.invoice.invoiceNumber}`);
    });
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
