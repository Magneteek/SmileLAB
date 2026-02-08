/**
 * E2E Workflow Test Script
 * Tests the complete workflow: Dentist → Material → LOT → Order → Worksheet → Invoice → PDFs
 *
 * Run with: npx tsx scripts/e2e-workflow-test.ts
 */

import { PrismaClient, WorksheetStatus, MaterialType, ProductCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting E2E Workflow Test\n');
  console.log('='.repeat(60));

  try {
    // =====================================================================
    // STEP 1: Get Admin User
    // =====================================================================
    console.log('\n📋 Step 1: Finding admin user...');
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('No admin user found. Please run seed first.');
    }
    console.log(`   ✅ Found admin: ${adminUser.email}`);

    // =====================================================================
    // STEP 2: Create Dentist
    // =====================================================================
    console.log('\n📋 Step 2: Creating dentist...');
    const dentist = await prisma.dentist.create({
      data: {
        clinicName: 'Test Dental Clinic',
        dentistName: 'Dr. Test Dentist',
        email: 'test.dentist@e2e-test.com',
        phone: '+386 1 234 5678',
        address: 'Test Street 123',
        city: 'Ljubljana',
        postalCode: '1000',
        country: 'Slovenia',
        licenseNumber: 'LIC-E2E-001',
        taxNumber: 'SI12345678',
        notes: 'E2E test dentist - can be deleted',
      }
    });
    console.log(`   ✅ Created dentist: ${dentist.dentistName} (ID: ${dentist.id})`);

    // =====================================================================
    // STEP 3: Create Material with LOT
    // =====================================================================
    console.log('\n📋 Step 3: Creating material...');
    const material = await prisma.material.create({
      data: {
        code: `MAT-E2E-${Date.now()}`,
        name: 'E2E Test Zirconia',
        type: MaterialType.CERAMIC,
        manufacturer: 'Test Manufacturer GmbH',
        description: 'High-quality zirconia for E2E testing',
        unit: 'gram',
        biocompatible: true,
        iso10993Cert: 'ISO 10993-1 compliant',
        ceMarked: true,
        ceNumber: 'CE-12345',
      }
    });
    console.log(`   ✅ Created material: ${material.name} (ID: ${material.id})`);

    console.log('\n📋 Step 4: Creating material LOT...');
    const materialLot = await prisma.materialLot.create({
      data: {
        materialId: material.id,
        lotNumber: `LOT-E2E-${Date.now()}`,
        quantityReceived: new Decimal(100),
        quantityAvailable: new Decimal(100),
        status: 'AVAILABLE',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        arrivalDate: new Date(),
        supplierName: 'E2E Test Supplier',
        notes: 'E2E test LOT',
      }
    });
    console.log(`   ✅ Created LOT: ${materialLot.lotNumber} (Qty: ${materialLot.quantityAvailable})`);

    // =====================================================================
    // STEP 4: Create Order
    // =====================================================================
    console.log('\n📋 Step 5: Creating order...');

    // Generate next order number
    const orderCount = await prisma.order.count();
    const nextOrderNumber = (orderCount + 1).toString().padStart(3, '0');

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber,
        dentistId: dentist.id,
        createdById: adminUser.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: 1, // Normal priority
        notes: 'E2E test order',
      }
    });
    console.log(`   ✅ Created order: #${order.orderNumber} (ID: ${order.id})`);

    // =====================================================================
    // STEP 5: Create Worksheet
    // =====================================================================
    console.log('\n📋 Step 6: Creating worksheet...');

    // Generate worksheet number
    const wsCount = await prisma.workSheet.count();
    const worksheetNumber = `DN-${(wsCount + 1).toString().padStart(4, '0')}`;

    const worksheet = await prisma.workSheet.create({
      data: {
        worksheetNumber,
        orderId: order.id,
        dentistId: dentist.id,
        createdById: adminUser.id,
        status: WorksheetStatus.DRAFT,
        technicalNotes: 'E2E test worksheet',
      }
    });
    console.log(`   ✅ Created worksheet: ${worksheet.worksheetNumber} (ID: ${worksheet.id})`);

    // =====================================================================
    // STEP 6: Add Teeth to Worksheet (FDI notation)
    // =====================================================================
    console.log('\n📋 Step 7: Adding teeth to worksheet...');

    // Add teeth 11, 12, 21 (upper front teeth)
    const teethToAdd = ['11', '12', '21'];
    for (const toothNumber of teethToAdd) {
      await prisma.worksheetTooth.create({
        data: {
          worksheetId: worksheet.id,
          toothNumber,
          workType: 'CROWN',
          shade: 'A2',
          notes: `E2E test tooth ${toothNumber}`,
        }
      });
    }
    console.log(`   ✅ Added ${teethToAdd.length} teeth: ${teethToAdd.join(', ')}`);

    // =====================================================================
    // STEP 7: Add Products to Worksheet
    // =====================================================================
    console.log('\n📋 Step 8: Adding products to worksheet...');

    // Get a product from the pricing list
    const product = await prisma.product.findFirst({
      where: {
        active: true,
        category: ProductCategory.FIKSNA_PROTETIKA
      }
    });

    if (!product) {
      throw new Error('No active CROWN product found. Please import pricing list first.');
    }

    const worksheetProduct = await prisma.worksheetProduct.create({
      data: {
        worksheetId: worksheet.id,
        productId: product.id,
        quantity: teethToAdd.length, // One for each tooth
        priceAtSelection: product.currentPrice,
        notes: 'E2E test product',
      }
    });
    console.log(`   ✅ Added product: ${product.name} x${teethToAdd.length} @ €${product.currentPrice}`);

    // =====================================================================
    // STEP 8: Add Material to Worksheet Product
    // =====================================================================
    console.log('\n📋 Step 9: Assigning material to worksheet product...');

    const worksheetProductMaterial = await prisma.worksheetProductMaterial.create({
      data: {
        worksheetProductId: worksheetProduct.id,
        materialId: material.id,
        materialLotId: materialLot.id,
        quantityUsed: new Decimal(3), // 3 units for 3 teeth
        notes: 'E2E test material assignment',
      }
    });
    console.log(`   ✅ Assigned material: ${material.name} (LOT: ${materialLot.lotNumber})`);

    // Update LOT quantity
    await prisma.materialLot.update({
      where: { id: materialLot.id },
      data: { quantityAvailable: { decrement: 3 } }
    });
    console.log(`   ✅ Deducted 3 units from LOT (remaining: ${Number(materialLot.quantityAvailable) - 3})`);

    // =====================================================================
    // STEP 9: Transition to QC_APPROVED (skip intermediate states for testing)
    // =====================================================================
    console.log('\n📋 Step 10: Transitioning worksheet to QC_APPROVED...');

    // Create QC record
    await prisma.qualityControl.create({
      data: {
        worksheet: { connect: { id: worksheet.id } },
        inspector: { connect: { id: adminUser.id } },
        result: 'APPROVED',
        notes: 'E2E test QC approval',
        aesthetics: true,
        fit: true,
        occlusion: true,
        shade: true,
        margins: true,
      }
    });

    await prisma.workSheet.update({
      where: { id: worksheet.id },
      data: {
        status: WorksheetStatus.QC_APPROVED,
      }
    });
    console.log(`   ✅ Worksheet status: QC_APPROVED`);

    // =====================================================================
    // STEP 10: Create Invoice
    // =====================================================================
    console.log('\n📋 Step 11: Creating invoice...');

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { not: null } },
      orderBy: { invoiceNumber: 'desc' }
    });
    const nextInvNum = lastInvoice && lastInvoice.invoiceNumber
      ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) + 1
      : 1;
    const invoiceNumber = `INV-${nextInvNum.toString().padStart(4, '0')}`;

    // Calculate amounts
    const subtotal = new Decimal(product.currentPrice).times(teethToAdd.length);
    const taxRate = new Decimal(22);
    const taxAmount = subtotal.times(taxRate).dividedBy(100);
    const totalAmount = subtotal.plus(taxAmount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        paymentReference: invoiceNumber,
        createdById: adminUser.id,
        dentistId: dentist.id,
        invoiceDate: new Date(),
        serviceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isDraft: false,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        lineItems: {
          create: {
            worksheetId: worksheet.id,
            description: `${product.name} (Worksheet ${worksheet.worksheetNumber})`,
            quantity: teethToAdd.length,
            unitPrice: product.currentPrice,
            totalPrice: subtotal,
            lineType: 'product',
            productCode: product.code,
            productName: product.name,
            position: 1,
          }
        }
      },
      include: {
        lineItems: true
      }
    });
    console.log(`   ✅ Created invoice: ${invoice.invoiceNumber}`);
    console.log(`      Subtotal: €${subtotal.toFixed(2)}`);
    console.log(`      Tax (22%): €${taxAmount.toFixed(2)}`);
    console.log(`      Total: €${totalAmount.toFixed(2)}`);

    // Update worksheet status to DELIVERED (status after invoicing)
    await prisma.workSheet.update({
      where: { id: worksheet.id },
      data: { status: WorksheetStatus.DELIVERED }
    });
    console.log(`   ✅ Worksheet status: DELIVERED`);

    // =====================================================================
    // SUMMARY
    // =====================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ E2E WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Created Resources:');
    console.log(`   • Dentist: ${dentist.dentistName} (ID: ${dentist.id})`);
    console.log(`   • Material: ${material.name} (ID: ${material.id})`);
    console.log(`   • Material LOT: ${materialLot.lotNumber} (ID: ${materialLot.id})`);
    console.log(`   • Order: #${order.orderNumber} (ID: ${order.id})`);
    console.log(`   • Worksheet: ${worksheet.worksheetNumber} (ID: ${worksheet.id})`);
    console.log(`   • Invoice: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

    console.log('\n📄 PDF Generation Endpoints (test with app running on port 3210):');
    console.log(`   • Annex XIII: http://localhost:3210/api/documents/annex-xiii/${worksheet.id}`);
    console.log(`   • Invoice PDF: http://localhost:3210/api/invoices/${invoice.id}/pdf`);
    console.log(`   • Worksheet PDF: http://localhost:3210/api/documents/worksheet-pdf/${worksheet.id}`);

    console.log('\n🧹 Cleanup (optional):');
    console.log(`   To delete test data, run:`);
    console.log(`   DELETE FROM "Invoice" WHERE id = '${invoice.id}';`);
    console.log(`   DELETE FROM "WorkSheet" WHERE id = '${worksheet.id}';`);
    console.log(`   DELETE FROM "Order" WHERE id = '${order.id}';`);
    console.log(`   DELETE FROM "MaterialLot" WHERE id = '${materialLot.id}';`);
    console.log(`   DELETE FROM "Material" WHERE id = '${material.id}';`);
    console.log(`   DELETE FROM "Dentist" WHERE id = '${dentist.id}';`);

  } catch (error) {
    console.error('\n❌ E2E TEST FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
