/**
 * E2E Test: Internal Dentist Workflow (Requires Invoice Toggle)
 *
 * This test validates the complete workflow for both internal and external dentists:
 * 1. Internal Dentist (requiresInvoicing = false):
 *    - Create dentist with invoice requirement OFF
 *    - Create order → worksheet → QC approval
 *    - Verify auto-delivery (no invoice needed)
 *    - Verify worksheet doesn't appear in invoice lists
 *
 * 2. External Dentist (requiresInvoicing = true):
 *    - Update same dentist to require invoicing
 *    - Create order → worksheet → QC approval
 *    - Verify manual invoice creation required
 *    - Verify worksheet appears in invoice lists
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3210';
const TEST_USER = {
  email: 'admin@smilelab.si',
  password: 'admin123', // Update with your test admin credentials
};

// Test data
const TEST_DENTIST = {
  clinicName: `E2E Test Clinic ${Date.now()}`,
  dentistName: 'Dr. E2E Tester',
  email: `e2e.test.${Date.now()}@example.com`,
  phone: '+386 1 234 5678',
  address: 'Test Street 123',
  city: 'Ljubljana',
  postalCode: '1000',
  country: 'Slovenia',
  taxNumber: 'SI12345678',
  paymentTerms: 30,
};

const TEST_PATIENT = {
  firstName: 'E2E',
  lastName: 'Patient',
  birthYear: '1990',
};

/**
 * Helper: Login to the application
 */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

/**
 * Helper: Create a dentist with specified invoice requirement
 */
async function createDentist(page: Page, requiresInvoicing: boolean) {
  // Navigate to dentists page
  await page.goto(`${BASE_URL}/dentists`);
  await page.click('text=New Dentist');

  // Fill basic information
  await page.fill('input[name="clinicName"]', TEST_DENTIST.clinicName);
  await page.fill('input[name="dentistName"]', TEST_DENTIST.dentistName);
  await page.fill('input[name="email"]', TEST_DENTIST.email);
  await page.fill('input[name="phone"]', TEST_DENTIST.phone);

  // Fill contact information
  await page.fill('input[name="address"]', TEST_DENTIST.address);

  // Select city from dropdown or type custom
  await page.click('[name="city"]');
  await page.click(`text=${TEST_DENTIST.city}`);

  await page.fill('input[name="postalCode"]', TEST_DENTIST.postalCode);

  // Fill business settings
  await page.fill('input[name="taxNumber"]', TEST_DENTIST.taxNumber);

  // Set payment terms
  await page.click('[name="paymentTerms"]');
  await page.click('text=30 days');

  // Set "Requires Invoice" toggle
  const invoiceToggle = page.locator('[name="requiresInvoicing"]');
  const isChecked = await invoiceToggle.isChecked();

  if (requiresInvoicing && !isChecked) {
    await invoiceToggle.click();
  } else if (!requiresInvoicing && isChecked) {
    await invoiceToggle.click();
  }

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for success and redirect
  await page.waitForURL(/\/dentists\/[a-z0-9-]+/);

  // Extract dentist ID from URL
  const url = page.url();
  const dentistId = url.split('/').pop();

  return dentistId as string;
}

/**
 * Helper: Update dentist's requiresInvoicing setting
 */
async function updateDentistInvoicingSetting(
  page: Page,
  dentistId: string,
  requiresInvoicing: boolean
) {
  await page.goto(`${BASE_URL}/dentists/${dentistId}`);
  await page.click('text=Edit');

  // Toggle the "Requires Invoice" switch
  const invoiceToggle = page.locator('[name="requiresInvoicing"]');
  const isChecked = await invoiceToggle.isChecked();

  if (requiresInvoicing && !isChecked) {
    await invoiceToggle.click();
  } else if (!requiresInvoicing && isChecked) {
    await invoiceToggle.click();
  }

  // Save changes
  await page.click('button:has-text("Update Dentist")');

  // Wait for success message
  await expect(page.locator('text=updated successfully')).toBeVisible();
}

/**
 * Helper: Create an order for a dentist
 */
async function createOrder(page: Page, dentistId: string) {
  await page.goto(`${BASE_URL}/orders`);
  await page.click('text=New Order');

  // Select dentist
  await page.click('[name="dentistId"]');
  await page.click(`text=${TEST_DENTIST.clinicName}`);

  // Fill patient information
  await page.fill('input[name="patientFirstName"]', TEST_PATIENT.firstName);
  await page.fill('input[name="patientLastName"]', TEST_PATIENT.lastName);
  await page.fill('input[name="patientBirthYear"]', TEST_PATIENT.birthYear);

  // Set due date (7 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  await page.fill('input[name="dueDate"]', dueDateStr);

  // Submit order
  await page.click('button[type="submit"]');

  // Wait for redirect to order detail page
  await page.waitForURL(/\/orders\/[a-z0-9-]+/);

  const url = page.url();
  const orderId = url.split('/').pop();

  return orderId as string;
}

/**
 * Helper: Create a worksheet for an order
 */
async function createWorksheet(page: Page, orderId: string) {
  await page.goto(`${BASE_URL}/orders/${orderId}`);
  await page.click('text=Create Worksheet');

  // Select teeth (example: tooth 11 and 21)
  await page.click('[data-tooth="11"]');
  await page.click('[data-tooth="21"]');

  // Select work type for selected teeth
  await page.selectOption('select[name="workType"]', 'CROWN');

  // Add products (assuming there's a product selection UI)
  await page.click('text=Add Product');
  await page.click('[data-product]:first-child'); // Select first product
  await page.fill('input[name="quantity"]', '2');

  // Save worksheet
  await page.click('button:has-text("Create Worksheet")');

  // Wait for redirect to worksheet page
  await page.waitForURL(/\/worksheets\/[a-z0-9-]+/);

  const url = page.url();
  const worksheetId = url.split('/').pop();

  return worksheetId as string;
}

/**
 * Helper: Complete production (move worksheet to QC_PENDING)
 */
async function completeProduction(page: Page, worksheetId: string) {
  await page.goto(`${BASE_URL}/worksheets/${worksheetId}`);

  // Start production (DRAFT → IN_PRODUCTION)
  await page.click('button:has-text("Start Production")');
  await expect(page.locator('text=IN_PRODUCTION')).toBeVisible();

  // Complete production (IN_PRODUCTION → QC_PENDING)
  await page.click('button:has-text("Complete Production")');
  await expect(page.locator('text=QC_PENDING')).toBeVisible();
}

/**
 * Helper: Approve QC
 */
async function approveQC(page: Page, worksheetId: string) {
  await page.goto(`${BASE_URL}/quality-control/${worksheetId}`);

  // Check all QC checkboxes
  await page.check('input[name="aesthetics"]');
  await page.check('input[name="fit"]');
  await page.check('input[name="occlusion"]');
  await page.check('input[name="shade"]');
  await page.check('input[name="margins"]');

  // Select APPROVED result
  await page.click('input[value="APPROVED"]');

  // Fill MDR compliance fields
  await page.fill('input[name="emdnCode"]', 'D230505');
  await page.fill('input[name="riskClass"]', 'IIa');
  await page.fill('input[name="documentVersion"]', '1.0');

  // Submit QC approval
  await page.click('button[type="submit"]');

  // Wait for success message
  await expect(page.locator('text=Quality control completed: APPROVED')).toBeVisible();
}

/**
 * Helper: Create an invoice for worksheets
 */
async function createInvoice(page: Page, worksheetIds: string[]) {
  await page.goto(`${BASE_URL}/invoices/new`);

  // Select worksheets
  for (const worksheetId of worksheetIds) {
    await page.check(`input[value="${worksheetId}"]`);
  }

  // Set invoice details
  const invoiceDate = new Date().toISOString().split('T')[0];
  await page.fill('input[name="invoiceDate"]', invoiceDate);

  // Calculate due date (30 days from invoice date)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  await page.fill('input[name="dueDate"]', dueDateStr);

  // Submit invoice
  await page.click('button:has-text("Create Invoice")');

  // Wait for redirect to invoice detail page
  await page.waitForURL(/\/invoices\/[a-z0-9-]+/);

  const url = page.url();
  const invoiceId = url.split('/').pop();

  return invoiceId as string;
}

// ============================================================================
// TEST SUITE: Internal Dentist Workflow
// ============================================================================

test.describe('Internal Dentist Workflow (requiresInvoicing toggle)', () => {
  let dentistId: string;
  let internalOrderId: string;
  let internalWorksheetId: string;
  let externalOrderId: string;
  let externalWorksheetId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ========================================================================
  // Scenario 1: Internal Dentist (No Invoice Required)
  // ========================================================================

  test('1.1 Create internal dentist with requiresInvoicing = false', async ({ page }) => {
    dentistId = await createDentist(page, false);

    // Verify dentist was created
    expect(dentistId).toBeTruthy();

    // Verify "Requires Invoice" toggle is OFF
    await page.goto(`${BASE_URL}/dentists/${dentistId}`);
    const invoiceToggle = page.locator('text=Requires Invoice').locator('..').locator('button');
    await expect(invoiceToggle).toHaveAttribute('data-state', 'unchecked');

    console.log(`✅ Created internal dentist: ${dentistId}`);
  });

  test('1.2 Create order for internal dentist', async ({ page }) => {
    // Use dentist from previous test (or create new one if running independently)
    if (!dentistId) {
      dentistId = await createDentist(page, false);
    }

    internalOrderId = await createOrder(page, dentistId);

    // Verify order was created
    expect(internalOrderId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Order');

    console.log(`✅ Created order: ${internalOrderId}`);
  });

  test('1.3 Create worksheet for internal order', async ({ page }) => {
    if (!internalOrderId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(page, dentistId);
    }

    internalWorksheetId = await createWorksheet(page, internalOrderId);

    // Verify worksheet was created
    expect(internalWorksheetId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Worksheet');

    console.log(`✅ Created worksheet: ${internalWorksheetId}`);
  });

  test('1.4 Complete production and approve QC for internal worksheet', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(page, dentistId);
      internalWorksheetId = await createWorksheet(page, internalOrderId);
    }

    // Complete production
    await completeProduction(page, internalWorksheetId);

    // Approve QC
    await approveQC(page, internalWorksheetId);

    console.log(`✅ QC approved for worksheet: ${internalWorksheetId}`);
  });

  test('1.5 Verify auto-delivery for internal dentist', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(page, dentistId);
      internalWorksheetId = await createWorksheet(page, internalOrderId);
      await completeProduction(page, internalWorksheetId);
      await approveQC(page, internalWorksheetId);
    }

    // Navigate to worksheet and verify status is DELIVERED
    await page.goto(`${BASE_URL}/worksheets/${internalWorksheetId}`);
    await expect(page.locator('text=DELIVERED')).toBeVisible();

    // Navigate to order and verify status is DELIVERED
    await page.goto(`${BASE_URL}/orders/${internalOrderId}`);
    await expect(page.locator('text=DELIVERED')).toBeVisible();

    console.log(`✅ Worksheet and order auto-delivered: ${internalWorksheetId}`);
  });

  test('1.6 Verify internal worksheet NOT in invoice list', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(page, dentistId);
      internalWorksheetId = await createWorksheet(page, internalOrderId);
      await completeProduction(page, internalWorksheetId);
      await approveQC(page, internalWorksheetId);
    }

    // Navigate to invoice creation page
    await page.goto(`${BASE_URL}/invoices/new`);

    // Verify the internal worksheet is NOT in the available worksheets list
    const worksheetCheckbox = page.locator(`input[value="${internalWorksheetId}"]`);
    await expect(worksheetCheckbox).not.toBeVisible();

    console.log(`✅ Internal worksheet correctly excluded from invoice lists`);
  });

  // ========================================================================
  // Scenario 2: Convert to External Dentist (Invoice Required)
  // ========================================================================

  test('2.1 Update dentist to require invoicing', async ({ page }) => {
    if (!dentistId) {
      dentistId = await createDentist(page, false);
    }

    // Update dentist to require invoicing
    await updateDentistInvoicingSetting(page, dentistId, true);

    // Verify toggle is now ON
    await page.goto(`${BASE_URL}/dentists/${dentistId}`);
    const invoiceToggle = page.locator('text=Requires Invoice').locator('..').locator('button');
    await expect(invoiceToggle).toHaveAttribute('data-state', 'checked');

    console.log(`✅ Updated dentist to require invoicing: ${dentistId}`);
  });

  test('2.2 Create new order for external dentist', async ({ page }) => {
    if (!dentistId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
    }

    externalOrderId = await createOrder(page, dentistId);

    // Verify order was created
    expect(externalOrderId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Order');

    console.log(`✅ Created order for external dentist: ${externalOrderId}`);
  });

  test('2.3 Create worksheet for external order', async ({ page }) => {
    if (!externalOrderId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
    }

    externalWorksheetId = await createWorksheet(page, externalOrderId);

    // Verify worksheet was created
    expect(externalWorksheetId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Worksheet');

    console.log(`✅ Created worksheet for external order: ${externalWorksheetId}`);
  });

  test('2.4 Complete production and approve QC for external worksheet', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
      externalWorksheetId = await createWorksheet(page, externalOrderId);
    }

    // Complete production
    await completeProduction(page, externalWorksheetId);

    // Approve QC
    await approveQC(page, externalWorksheetId);

    console.log(`✅ QC approved for external worksheet: ${externalWorksheetId}`);
  });

  test('2.5 Verify external worksheet stays QC_APPROVED (no auto-delivery)', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    // Navigate to worksheet and verify status is QC_APPROVED (NOT DELIVERED)
    await page.goto(`${BASE_URL}/worksheets/${externalWorksheetId}`);
    await expect(page.locator('text=QC_APPROVED')).toBeVisible();
    await expect(page.locator('text=DELIVERED')).not.toBeVisible();

    console.log(`✅ External worksheet correctly stays QC_APPROVED: ${externalWorksheetId}`);
  });

  test('2.6 Verify external worksheet appears in invoice list', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    // Navigate to invoice creation page
    await page.goto(`${BASE_URL}/invoices/new`);

    // Verify the external worksheet IS in the available worksheets list
    const worksheetCheckbox = page.locator(`input[value="${externalWorksheetId}"]`);
    await expect(worksheetCheckbox).toBeVisible();

    console.log(`✅ External worksheet correctly appears in invoice lists`);
  });

  test('2.7 Create invoice for external worksheet', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    // Create invoice
    const invoiceId = await createInvoice(page, [externalWorksheetId]);

    // Verify invoice was created
    expect(invoiceId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Invoice');

    // Verify worksheet is now INVOICED
    await page.goto(`${BASE_URL}/worksheets/${externalWorksheetId}`);
    await expect(page.locator('text=INVOICED')).toBeVisible();

    console.log(`✅ Invoice created: ${invoiceId}`);
  });

  test('2.8 Finalize invoice and verify order delivery', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(page, dentistId);
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    const invoiceId = await createInvoice(page, [externalWorksheetId]);

    // Finalize invoice (remove draft status)
    await page.goto(`${BASE_URL}/invoices/${invoiceId}`);
    await page.click('button:has-text("Finalize Invoice")');
    await expect(page.locator('text=SENT')).toBeVisible();

    // Verify worksheet is now DELIVERED
    await page.goto(`${BASE_URL}/worksheets/${externalWorksheetId}`);
    await expect(page.locator('text=DELIVERED')).toBeVisible();

    // Verify order is now DELIVERED
    await page.goto(`${BASE_URL}/orders/${externalOrderId}`);
    await expect(page.locator('text=DELIVERED')).toBeVisible();

    console.log(`✅ Invoice finalized, worksheet and order delivered`);
  });
});

// ============================================================================
// CLEANUP (Optional)
// ============================================================================

test.afterAll(async ({ browser }) => {
  // Optional: Clean up test data
  // This could call API endpoints to delete test dentist, orders, worksheets
  console.log('E2E test suite completed');
});
