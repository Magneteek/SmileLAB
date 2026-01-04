/**
 * E2E Test: Invoice Requirement Feature (requiresInvoicing Toggle)
 *
 * This comprehensive test validates the complete workflow for both internal and external dentists
 * based on the requiresInvoicing setting in the dentist profile.
 *
 * SCENARIO 1: Internal Dentist (requiresInvoicing = false)
 *   - Create dentist with invoice requirement OFF
 *   - Create order → worksheet → production → QC approval
 *   - VERIFY: Auto-delivery (worksheet goes directly to DELIVERED after QC approval)
 *   - VERIFY: Worksheet does NOT appear in invoice creation lists
 *
 * SCENARIO 2: External Dentist (requiresInvoicing = true)
 *   - Update same dentist to require invoicing
 *   - Create order → worksheet → production → QC approval
 *   - VERIFY: Worksheet stays in QC_APPROVED (does NOT auto-deliver)
 *   - VERIFY: Worksheet appears in invoice creation lists
 *   - Create and finalize invoice
 *   - VERIFY: Worksheet and order transition to DELIVERED after invoice finalization
 *
 * Test demonstrates the critical business logic:
 * - Internal dentists (requiresInvoicing=false): Auto-complete after QC for internal work
 * - External dentists (requiresInvoicing=true): Require manual invoice creation
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3210';
const TEST_USER = {
  email: 'admin@smilelab.si',
  password: 'admin123',
};

// ============================================================================
// Test Data
// ============================================================================

const timestamp = Date.now();

const INTERNAL_DENTIST = {
  clinicName: `E2E Test Clinic Internal ${timestamp}`,
  dentistName: 'Dr. Internal Tester',
  email: `internal.test.${timestamp}@example.com`,
  phone: '+386 1 999 8888',
  address: 'Test Street 123',
  city: 'Ljubljana',
  postalCode: '1000',
  country: 'Slovenia',
  taxNumber: 'SI99999999',
  paymentTerms: 30,
  requiresInvoicing: false, // KEY: Internal dentist
};

const INTERNAL_PATIENT = {
  name: 'Test Patient Internal',
};

const EXTERNAL_PATIENT = {
  name: 'Test Patient External',
};

const WORKSHEET_DATA = {
  deviceDescription: 'Ceramic crown restoration for anterior tooth',
  intendedUse: 'Permanent tooth restoration and aesthetic improvement',
  technicalNotes: 'Standard ceramic crown with natural shade matching',
  tooth: '11', // Upper right central incisor (FDI notation)
  workType: 'CROWN',
};

const QC_DATA = {
  emdnCode: 'D230505',
  riskClass: 'IIa',
  documentVersion: '1.0',
  result: 'APPROVED',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login to the application
 */
async function login(page: Page) {
  // Try to navigate to dashboard directly (dev environment may auto-authenticate)
  await page.goto(`${BASE_URL}/en/dashboard`);

  // Wait a moment for any redirects
  await page.waitForTimeout(1000);

  const currentUrl = page.url();

  // If we're on the dashboard, we're already authenticated
  if (currentUrl.includes('/dashboard')) {
    console.log('✓ Already authenticated (dev environment)');
    return;
  }

  // If redirected to login, fill the form
  if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
    console.log('→ Logging in...');

    // Wait for login form
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('✓ Login successful');
  } else {
    console.log('✓ Already authenticated');
  }
}

/**
 * Create a dentist with specified invoice requirement
 */
async function createDentist(page: Page, requiresInvoicing: boolean): Promise<string> {
  console.log(`\n📝 Creating dentist (requiresInvoicing=${requiresInvoicing})...`);

  await page.goto(`${BASE_URL}/en/dentists/new`);

  // Fill basic information
  await page.fill('input[name="clinicName"]', INTERNAL_DENTIST.clinicName);
  await page.fill('input[name="dentistName"]', INTERNAL_DENTIST.dentistName);
  await page.fill('input[name="email"]', INTERNAL_DENTIST.email);
  await page.fill('input[name="phone"]', INTERNAL_DENTIST.phone);

  // Fill contact information
  await page.fill('input[name="address"]', INTERNAL_DENTIST.address);

  // Select city
  await page.click('[name="city"]');
  await page.click(`text="${INTERNAL_DENTIST.city}"`);

  await page.fill('input[name="postalCode"]', INTERNAL_DENTIST.postalCode);

  // Fill business settings
  await page.fill('input[name="taxNumber"]', INTERNAL_DENTIST.taxNumber);

  // Set payment terms
  await page.click('[name="paymentTerms"]');
  await page.click('text=30 days');

  // CRITICAL: Set "Requires Invoice" toggle
  const invoiceToggle = page.locator('switch[name="requiresInvoicing"]');
  const isChecked = await invoiceToggle.isChecked();

  if (requiresInvoicing && !isChecked) {
    await invoiceToggle.click();
  } else if (!requiresInvoicing && isChecked) {
    await invoiceToggle.click();
  }

  console.log(`  ✓ Set requiresInvoicing toggle to: ${requiresInvoicing}`);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dentist detail page
  await page.waitForURL(/\/dentists\/[a-z0-9-]+/);

  // Extract dentist ID from URL
  const url = page.url();
  const dentistId = url.split('/').pop() || '';

  console.log(`  ✓ Dentist created: ${dentistId}`);
  console.log(`  ✓ Clinic: ${INTERNAL_DENTIST.clinicName}`);

  return dentistId;
}

/**
 * Update dentist's requiresInvoicing setting
 */
async function updateDentistInvoicingSetting(
  page: Page,
  dentistId: string,
  requiresInvoicing: boolean
): Promise<void> {
  console.log(`\n📝 Updating dentist to requiresInvoicing=${requiresInvoicing}...`);

  await page.goto(`${BASE_URL}/en/dentists/${dentistId}`);
  await page.click('text=Edit');

  // Toggle the "Requires Invoice" switch
  const invoiceToggle = page.locator('switch[name="requiresInvoicing"]');
  const isChecked = await invoiceToggle.isChecked();

  if (requiresInvoicing && !isChecked) {
    await invoiceToggle.click();
  } else if (!requiresInvoicing && isChecked) {
    await invoiceToggle.click();
  }

  // Save changes
  await page.click('button:has-text("Update Dentist")');

  // Wait for success message
  await expect(page.locator('text=updated successfully')).toBeVisible({ timeout: 5000 });

  console.log(`  ✓ Dentist updated successfully`);
}

/**
 * Create an order for a dentist
 */
async function createOrder(page: Page, clinicName: string, patientName: string): Promise<string> {
  console.log(`\n📦 Creating order for ${clinicName}...`);

  await page.goto(`${BASE_URL}/en/orders/new`);

  // Wait for form to load
  await page.waitForSelector('combobox[name="dentistId"]', { timeout: 10000 });

  // Select dentist
  await page.click('combobox[name="dentistId"]');
  await page.click(`text="${clinicName}"`);

  // Fill patient information
  await page.fill('input[name="patientName"]', patientName);

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
  const orderId = url.split('/').pop() || '';

  // Extract order number from page
  const orderNumber = await page.locator('h1').textContent();

  console.log(`  ✓ Order created: ${orderId}`);
  console.log(`  ✓ Order number: ${orderNumber}`);
  console.log(`  ✓ Patient: ${patientName}`);

  return orderId;
}

/**
 * Create a worksheet for an order
 */
async function createWorksheet(page: Page, orderId: string): Promise<string> {
  console.log(`\n🦷 Creating worksheet for order ${orderId}...`);

  await page.goto(`${BASE_URL}/en/orders/${orderId}`);
  await page.click('text=Create Worksheet');

  // Wait for worksheet creation form
  await page.waitForURL(/\/worksheets\/new\?orderId=/);

  // Step 1: Fill Basic Info
  console.log('  → Step 1: Basic Info');
  await page.fill('textarea[name="deviceDescription"]', WORKSHEET_DATA.deviceDescription);
  await page.fill('textarea[name="intendedUse"]', WORKSHEET_DATA.intendedUse);
  await page.fill('textarea[name="technicalNotes"]', WORKSHEET_DATA.technicalNotes);
  await page.click('button:has-text("Save & Continue")');

  // Step 2: Teeth Selection
  console.log('  → Step 2: Teeth Selection');
  await page.waitForSelector('[data-tooth]', { timeout: 10000 });

  // Select tooth (FDI notation)
  await page.click(`[data-tooth="${WORKSHEET_DATA.tooth}"]`);

  // Select work type
  await page.selectOption('select[name="workType"]', WORKSHEET_DATA.workType);
  await page.click('button:has-text("Save & Continue")');

  // Step 3: Products
  console.log('  → Step 3: Products');
  await page.waitForSelector('[data-product]', { timeout: 10000 });

  // Add first available product
  await page.click('[data-product]:first-child');
  await page.fill('input[name="quantity"]', '1');

  // Submit worksheet
  await page.click('button:has-text("Create Worksheet")');

  // Wait for redirect to worksheet page
  await page.waitForURL(/\/worksheets\/[a-z0-9-]+/);

  const url = page.url();
  const worksheetId = url.split('/').pop() || '';

  // Extract worksheet number from page
  const worksheetNumber = await page.locator('h1').textContent();

  console.log(`  ✓ Worksheet created: ${worksheetId}`);
  console.log(`  ✓ Worksheet number: ${worksheetNumber}`);

  return worksheetId;
}

/**
 * Progress worksheet through production stages to QC_PENDING
 */
async function completeProduction(page: Page, worksheetId: string): Promise<void> {
  console.log(`\n⚙️  Progressing worksheet through production...`);

  await page.goto(`${BASE_URL}/en/worksheets/${worksheetId}`);

  // DRAFT → IN_PRODUCTION
  console.log('  → Status: DRAFT → IN_PRODUCTION');
  await page.click('button:has-text("Start Production")');
  await expect(page.locator('text=IN_PRODUCTION')).toBeVisible({ timeout: 5000 });

  // IN_PRODUCTION → QC_PENDING
  console.log('  → Status: IN_PRODUCTION → QC_PENDING');
  await page.click('button:has-text("Complete Production")');
  await expect(page.locator('text=QC_PENDING')).toBeVisible({ timeout: 5000 });

  console.log('  ✓ Production completed, ready for QC');
}

/**
 * Approve QC for a worksheet
 */
async function approveQC(page: Page, worksheetId: string): Promise<void> {
  console.log(`\n✅ Performing QC approval...`);

  await page.goto(`${BASE_URL}/en/quality-control/${worksheetId}`);

  // Check all QC criteria
  await page.check('input[name="aesthetics"]');
  await page.check('input[name="fit"]');
  await page.check('input[name="occlusion"]');
  await page.check('input[name="shade"]');
  await page.check('input[name="margins"]');

  // Select APPROVED result
  await page.click('input[value="APPROVED"]');

  // Fill MDR compliance fields
  await page.fill('input[name="emdnCode"]', QC_DATA.emdnCode);
  await page.fill('input[name="riskClass"]', QC_DATA.riskClass);
  await page.fill('input[name="documentVersion"]', QC_DATA.documentVersion);

  // Submit QC approval
  await page.click('button[type="submit"]');

  // Wait for success message
  await expect(
    page.locator('text=Quality control completed: APPROVED')
  ).toBeVisible({ timeout: 5000 });

  console.log('  ✓ QC approved successfully');
}

/**
 * Get worksheet status from detail page
 */
async function getWorksheetStatus(page: Page, worksheetId: string): Promise<string> {
  await page.goto(`${BASE_URL}/en/worksheets/${worksheetId}`);
  const statusElement = page.locator('[data-testid="worksheet-status"]').or(
    page.locator('text=/^(DRAFT|IN_PRODUCTION|QC_PENDING|QC_APPROVED|INVOICED|DELIVERED)$/')
  );
  const status = await statusElement.textContent();
  return status || '';
}

/**
 * Get order status from detail page
 */
async function getOrderStatus(page: Page, orderId: string): Promise<string> {
  await page.goto(`${BASE_URL}/en/orders/${orderId}`);
  const statusElement = page.locator('[data-testid="order-status"]').or(
    page.locator('text=/^(PENDING|IN_PRODUCTION|QC_PENDING|QC_APPROVED|INVOICED|DELIVERED)$/')
  );
  const status = await statusElement.textContent();
  return status || '';
}

/**
 * Check if worksheet is available for invoicing
 */
async function isWorksheetAvailableForInvoice(
  page: Page,
  worksheetId: string
): Promise<boolean> {
  await page.goto(`${BASE_URL}/en/invoices/new`);

  // Check if worksheet checkbox exists in the form
  const worksheetCheckbox = page.locator(`input[value="${worksheetId}"]`);

  try {
    await worksheetCheckbox.waitFor({ state: 'visible', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an invoice for worksheets
 */
async function createInvoice(page: Page, worksheetIds: string[]): Promise<string> {
  console.log(`\n💰 Creating invoice for ${worksheetIds.length} worksheet(s)...`);

  await page.goto(`${BASE_URL}/en/invoices/new`);

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
  const invoiceId = url.split('/').pop() || '';

  console.log(`  ✓ Invoice created: ${invoiceId}`);

  return invoiceId;
}

/**
 * Finalize an invoice
 */
async function finalizeInvoice(page: Page, invoiceId: string): Promise<void> {
  console.log(`\n📤 Finalizing invoice ${invoiceId}...`);

  await page.goto(`${BASE_URL}/en/invoices/${invoiceId}`);
  await page.click('button:has-text("Finalize Invoice")');

  // Wait for status change
  await expect(page.locator('text=SENT')).toBeVisible({ timeout: 5000 });

  console.log('  ✓ Invoice finalized and sent');
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Invoice Requirement Feature (requiresInvoicing toggle)', () => {
  let dentistId: string;
  let internalOrderId: string;
  let internalWorksheetId: string;
  let externalOrderId: string;
  let externalWorksheetId: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ==========================================================================
  // SCENARIO 1: Internal Dentist (requiresInvoicing = false)
  // Expected: Auto-delivery after QC approval (no invoice required)
  // ==========================================================================

  test('1.1: Create internal dentist with requiresInvoicing=false', async ({ page }) => {
    dentistId = await createDentist(page, false);

    // Verify dentist was created
    expect(dentistId).toBeTruthy();
    expect(dentistId).toMatch(/^[a-z0-9-]+$/);

    // Verify "Requires Invoice" toggle is OFF
    await page.goto(`${BASE_URL}/en/dentists/${dentistId}`);
    const invoiceToggle = page.locator('text=Requires Invoice').locator('..').locator('button');
    await expect(invoiceToggle).toHaveAttribute('data-state', 'unchecked');

    console.log(`✅ Test 1.1 PASSED: Internal dentist created`);
  });

  test('1.2: Create order for internal dentist', async ({ page }) => {
    if (!dentistId) {
      dentistId = await createDentist(page, false);
    }

    internalOrderId = await createOrder(
      page,
      INTERNAL_DENTIST.clinicName,
      INTERNAL_PATIENT.name
    );

    // Verify order was created
    expect(internalOrderId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Order');

    console.log(`✅ Test 1.2 PASSED: Order created for internal dentist`);
  });

  test('1.3: Create worksheet for internal order', async ({ page }) => {
    if (!internalOrderId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        INTERNAL_PATIENT.name
      );
    }

    internalWorksheetId = await createWorksheet(page, internalOrderId);

    // Verify worksheet was created
    expect(internalWorksheetId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Worksheet');

    console.log(`✅ Test 1.3 PASSED: Worksheet created`);
  });

  test('1.4: Complete production and approve QC', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        INTERNAL_PATIENT.name
      );
      internalWorksheetId = await createWorksheet(page, internalOrderId);
    }

    // Complete production stages
    await completeProduction(page, internalWorksheetId);

    // Approve QC
    await approveQC(page, internalWorksheetId);

    console.log(`✅ Test 1.4 PASSED: Production completed and QC approved`);
  });

  test('1.5: ⭐ CRITICAL - Verify auto-delivery for internal dentist', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        INTERNAL_PATIENT.name
      );
      internalWorksheetId = await createWorksheet(page, internalOrderId);
      await completeProduction(page, internalWorksheetId);
      await approveQC(page, internalWorksheetId);
    }

    console.log('\n🔍 CRITICAL TEST: Verifying auto-delivery for internal dentist...');

    // Get worksheet status
    const worksheetStatus = await getWorksheetStatus(page, internalWorksheetId);
    console.log(`  Worksheet status: ${worksheetStatus}`);

    // Get order status
    const orderStatus = await getOrderStatus(page, internalOrderId);
    console.log(`  Order status: ${orderStatus}`);

    // CRITICAL ASSERTIONS
    expect(worksheetStatus).toBe('DELIVERED');
    expect(orderStatus).toBe('DELIVERED');

    console.log('  ✓ Worksheet auto-delivered after QC approval');
    console.log('  ✓ Order auto-delivered');
    console.log('  ✓ NO invoice creation step required');
    console.log(`✅ Test 1.5 PASSED: Auto-delivery verified for internal dentist`);
  });

  test('1.6: ⭐ CRITICAL - Verify internal worksheet NOT in invoice list', async ({ page }) => {
    if (!internalWorksheetId) {
      dentistId = await createDentist(page, false);
      internalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        INTERNAL_PATIENT.name
      );
      internalWorksheetId = await createWorksheet(page, internalOrderId);
      await completeProduction(page, internalWorksheetId);
      await approveQC(page, internalWorksheetId);
    }

    console.log('\n🔍 CRITICAL TEST: Verifying internal worksheet NOT in invoice list...');

    const isAvailable = await isWorksheetAvailableForInvoice(page, internalWorksheetId);

    // CRITICAL ASSERTION
    expect(isAvailable).toBe(false);

    console.log('  ✓ Internal worksheet correctly excluded from invoice lists');
    console.log(`✅ Test 1.6 PASSED: Internal worksheet not available for invoicing`);
  });

  // ==========================================================================
  // SCENARIO 2: External Dentist (requiresInvoicing = true)
  // Expected: Manual invoice required after QC approval
  // ==========================================================================

  test('2.1: Update dentist to require invoicing', async ({ page }) => {
    if (!dentistId) {
      dentistId = await createDentist(page, false);
    }

    // Update dentist to require invoicing
    await updateDentistInvoicingSetting(page, dentistId, true);

    // Verify toggle is now ON
    await page.goto(`${BASE_URL}/en/dentists/${dentistId}`);
    const invoiceToggle = page.locator('text=Requires Invoice').locator('..').locator('button');
    await expect(invoiceToggle).toHaveAttribute('data-state', 'checked');

    console.log(`✅ Test 2.1 PASSED: Dentist updated to require invoicing`);
  });

  test('2.2: Create new order for external dentist', async ({ page }) => {
    if (!dentistId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
    }

    externalOrderId = await createOrder(
      page,
      INTERNAL_DENTIST.clinicName,
      EXTERNAL_PATIENT.name
    );

    // Verify order was created
    expect(externalOrderId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Order');

    console.log(`✅ Test 2.2 PASSED: Order created for external dentist`);
  });

  test('2.3: Create worksheet for external order', async ({ page }) => {
    if (!externalOrderId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
    }

    externalWorksheetId = await createWorksheet(page, externalOrderId);

    // Verify worksheet was created
    expect(externalWorksheetId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Worksheet');

    console.log(`✅ Test 2.3 PASSED: Worksheet created for external order`);
  });

  test('2.4: Complete production and approve QC for external worksheet', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
      externalWorksheetId = await createWorksheet(page, externalOrderId);
    }

    // Complete production
    await completeProduction(page, externalWorksheetId);

    // Approve QC
    await approveQC(page, externalWorksheetId);

    console.log(`✅ Test 2.4 PASSED: QC approved for external worksheet`);
  });

  test('2.5: ⭐ CRITICAL - Verify NO auto-delivery for external dentist', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    console.log('\n🔍 CRITICAL TEST: Verifying NO auto-delivery for external dentist...');

    // Get worksheet status
    const worksheetStatus = await getWorksheetStatus(page, externalWorksheetId);
    console.log(`  Worksheet status: ${worksheetStatus}`);

    // Get order status
    const orderStatus = await getOrderStatus(page, externalOrderId);
    console.log(`  Order status: ${orderStatus}`);

    // CRITICAL ASSERTIONS
    expect(worksheetStatus).toBe('QC_APPROVED'); // NOT DELIVERED
    expect(orderStatus).toBe('QC_APPROVED'); // NOT DELIVERED

    console.log('  ✓ Worksheet stays in QC_APPROVED (does NOT auto-deliver)');
    console.log('  ✓ Order stays in QC_APPROVED');
    console.log('  ✓ Manual invoice creation required');
    console.log(`✅ Test 2.5 PASSED: No auto-delivery for external dentist`);
  });

  test('2.6: ⭐ CRITICAL - Verify external worksheet IN invoice list', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    console.log('\n🔍 CRITICAL TEST: Verifying external worksheet IN invoice list...');

    const isAvailable = await isWorksheetAvailableForInvoice(page, externalWorksheetId);

    // CRITICAL ASSERTION
    expect(isAvailable).toBe(true);

    console.log('  ✓ External worksheet correctly appears in invoice lists');
    console.log(`✅ Test 2.6 PASSED: External worksheet available for invoicing`);
  });

  test('2.7: Create invoice for external worksheet', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    // Create invoice
    const invoiceId = await createInvoice(page, [externalWorksheetId]);

    // Verify invoice was created
    expect(invoiceId).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Invoice');

    // Verify worksheet status changed to INVOICED
    const worksheetStatus = await getWorksheetStatus(page, externalWorksheetId);
    expect(worksheetStatus).toBe('INVOICED');

    console.log(`✅ Test 2.7 PASSED: Invoice created, worksheet status = INVOICED`);
  });

  test('2.8: ⭐ CRITICAL - Finalize invoice and verify final delivery', async ({ page }) => {
    if (!externalWorksheetId) {
      dentistId = await createDentist(page, false);
      await updateDentistInvoicingSetting(page, dentistId, true);
      externalOrderId = await createOrder(
        page,
        INTERNAL_DENTIST.clinicName,
        EXTERNAL_PATIENT.name
      );
      externalWorksheetId = await createWorksheet(page, externalOrderId);
      await completeProduction(page, externalWorksheetId);
      await approveQC(page, externalWorksheetId);
    }

    const invoiceId = await createInvoice(page, [externalWorksheetId]);

    // Finalize invoice
    await finalizeInvoice(page, invoiceId);

    console.log('\n🔍 CRITICAL TEST: Verifying final delivery after invoice...');

    // Verify worksheet is now DELIVERED
    const worksheetStatus = await getWorksheetStatus(page, externalWorksheetId);
    console.log(`  Worksheet status: ${worksheetStatus}`);
    expect(worksheetStatus).toBe('DELIVERED');

    // Verify order is now DELIVERED
    const orderStatus = await getOrderStatus(page, externalOrderId);
    console.log(`  Order status: ${orderStatus}`);
    expect(orderStatus).toBe('DELIVERED');

    console.log('  ✓ Invoice finalized and sent');
    console.log('  ✓ Worksheet transitioned to DELIVERED');
    console.log('  ✓ Order transitioned to DELIVERED');
    console.log(`✅ Test 2.8 PASSED: Full external workflow completed`);
  });
});

// ============================================================================
// Cleanup (Optional)
// ============================================================================

test.afterAll(async () => {
  console.log('\n✅ E2E test suite completed successfully');
  console.log('\nTest Summary:');
  console.log('  - Scenario 1 (Internal): requiresInvoicing=false → Auto-delivery');
  console.log('  - Scenario 2 (External): requiresInvoicing=true → Manual invoice required');
  console.log('\nKey Validations:');
  console.log('  ✓ Auto-delivery logic for internal dentists');
  console.log('  ✓ Manual invoice requirement for external dentists');
  console.log('  ✓ Worksheet filtering in invoice lists');
  console.log('  ✓ Complete workflow: Order → Worksheet → QC → Invoice → Delivery');
});
