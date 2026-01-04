/**
 * Fix Invoiced Order Status Script
 *
 * This script fixes orders that have invoiced worksheets but are still
 * showing QC_APPROVED status (from before the Order status update fix).
 *
 * Updates Order status to INVOICED when the associated worksheet is INVOICED.
 *
 * Run with: npx tsx scripts/fix-invoiced-order-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding orders with invoiced worksheets but QC_APPROVED status...\n');

  // Find all orders where:
  // 1. Order status is QC_APPROVED
  // 2. Associated worksheet status is INVOICED
  const ordersToFix = await prisma.order.findMany({
    where: {
      status: 'QC_APPROVED',
      worksheets: {
        some: {
          status: 'INVOICED',
        },
      },
    },
    include: {
      worksheets: {
        select: {
          id: true,
          worksheetNumber: true,
          status: true,
        },
      },
    },
  });

  console.log(`Found ${ordersToFix.length} order(s) to fix\n`);

  if (ordersToFix.length === 0) {
    console.log('✅ No orders need fixing. All good!');
    return;
  }

  // Show what will be fixed
  console.log('📋 Orders to update:\n');
  ordersToFix.forEach((order, index) => {
    const invoicedWorksheets = order.worksheets.filter((ws) => ws.status === 'INVOICED');
    console.log(`${index + 1}. Order #${order.orderNumber}`);
    console.log(`   Current Status: QC_APPROVED`);
    console.log(
      `   Invoiced Worksheets: ${invoicedWorksheets.map((ws) => ws.worksheetNumber).join(', ')}`
    );
    console.log(`   Will update to: INVOICED\n`);
  });

  // Update orders
  console.log('🔧 Updating order statuses to INVOICED...\n');

  const result = await prisma.order.updateMany({
    where: {
      id: {
        in: ordersToFix.map((order) => order.id),
      },
    },
    data: {
      status: 'INVOICED',
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Updated ${result.count} order(s) to INVOICED status\n`);

  // Show summary
  console.log('📊 Updated orders:');
  ordersToFix.forEach((order, index) => {
    console.log(`${index + 1}. Order #${order.orderNumber}: QC_APPROVED → INVOICED ✓`);
  });

  console.log('\n✨ Done! Order statuses now match their worksheet invoicing status.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
