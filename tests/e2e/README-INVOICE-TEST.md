# E2E Test: Invoice Requirement Feature

## Overview

This comprehensive E2E test validates the **invoice requirement feature** (`requiresInvoicing` toggle) in the dentist profile, which controls whether orders automatically complete after QC approval or require manual invoice creation.

## Test File

**Location**: `tests/e2e/invoice-requirement-feature.spec.ts`

**Test Cases**: 14 total (6 for Scenario 1, 8 for Scenario 2)

**Estimated Runtime**: 5-8 minutes for complete test suite

## What This Test Validates

### Scenario 1: Internal Dentist (requiresInvoicing = false)
**Business Logic**: Orders for internal dentists auto-complete after QC approval without requiring invoices.

**Test Flow**:
1. Create dentist with `requiresInvoicing = false`
2. Create order → worksheet → production → QC approval
3. **✅ VERIFY**: Worksheet and order automatically transition to DELIVERED
4. **✅ VERIFY**: Worksheet does NOT appear in invoice creation lists

### Scenario 2: External Dentist (requiresInvoicing = true)
**Business Logic**: Orders for external dentists require manual invoice creation after QC approval.

**Test Flow**:
1. Update same dentist to `requiresInvoicing = true`
2. Create order → worksheet → production → QC approval
3. **✅ VERIFY**: Worksheet stays in QC_APPROVED (does NOT auto-deliver)
4. **✅ VERIFY**: Worksheet appears in invoice creation lists
5. Create and finalize invoice
6. **✅ VERIFY**: Worksheet and order transition to DELIVERED after invoice

## Key Verification Points

| Scenario | requiresInvoicing | Post-QC Status | Invoice Required | Final Delivery |
|----------|-------------------|----------------|------------------|----------------|
| Internal | `false` | DELIVERED | ❌ NO | Automatic |
| External | `true` | QC_APPROVED | ✅ YES | After invoice |

## Running the Test

### Prerequisites

```bash
# 1. Ensure development server is running
npm run dev
# Should be accessible at http://localhost:3210

# 2. Ensure database is seeded
npx prisma db push
npx prisma db seed

# 3. Install Playwright if not already installed
npx playwright install
```

### Run Complete Test Suite

```bash
# Run all tests in the file
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts

# Run with UI mode (interactive)
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts --ui

# Run with headed browser (visible)
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts --headed

# Run with debug mode
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts --debug
```

### Run Specific Scenarios

```bash
# Run only Scenario 1 (Internal Dentist)
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts -g "1\\."

# Run only Scenario 2 (External Dentist)
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts -g "2\\."

# Run only critical tests
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts -g "CRITICAL"
```

### Generate Test Report

```bash
# Run tests and generate HTML report
npx playwright test tests/e2e/invoice-requirement-feature.spec.ts --reporter=html

# Open the report
npx playwright show-report
```

## Test Architecture

### Helper Functions

The test uses comprehensive helper functions for reusability:

- `login()` - Authenticate user
- `createDentist()` - Create dentist with specified invoice setting
- `updateDentistInvoicingSetting()` - Toggle invoice requirement
- `createOrder()` - Create order for dentist
- `createWorksheet()` - Multi-step worksheet creation
- `completeProduction()` - Progress through production stages
- `approveQC()` - Complete quality control approval
- `getWorksheetStatus()` - Retrieve current worksheet status
- `getOrderStatus()` - Retrieve current order status
- `isWorksheetAvailableForInvoice()` - Check invoice list availability
- `createInvoice()` - Generate invoice for worksheets
- `finalizeInvoice()` - Finalize and send invoice

### Test Data

All test data is timestamped to prevent conflicts:

```typescript
const INTERNAL_DENTIST = {
  clinicName: `E2E Test Clinic Internal ${Date.now()}`,
  dentistName: 'Dr. Internal Tester',
  email: `internal.test.${Date.now()}@example.com`,
  // ... other fields
};
```

## Expected Console Output

```
📝 Creating dentist (requiresInvoicing=false)...
  ✓ Set requiresInvoicing toggle to: false
  ✓ Dentist created: cmjyurbbk001f1yaoos0codnr
  ✓ Clinic: E2E Test Clinic Internal 1735939200000

✅ Test 1.1 PASSED: Internal dentist created

📦 Creating order for E2E Test Clinic Internal...
  ✓ Order created: cmjyut3fj001j1yaowcvedmub
  ✓ Order number: Order 26004
  ✓ Patient: Test Patient Internal

✅ Test 1.2 PASSED: Order created for internal dentist

🦷 Creating worksheet for order cmjyut3fj001j1yaowcvedmub...
  → Step 1: Basic Info
  → Step 2: Teeth Selection
  → Step 3: Products
  ✓ Worksheet created: cm12345678
  ✓ Worksheet number: DN-26001

✅ Test 1.3 PASSED: Worksheet created

⚙️  Progressing worksheet through production...
  → Status: DRAFT → IN_PRODUCTION
  → Status: IN_PRODUCTION → QC_PENDING
  ✓ Production completed, ready for QC

✅ Performing QC approval...
  ✓ QC approved successfully

✅ Test 1.4 PASSED: Production completed and QC approved

🔍 CRITICAL TEST: Verifying auto-delivery for internal dentist...
  Worksheet status: DELIVERED
  Order status: DELIVERED
  ✓ Worksheet auto-delivered after QC approval
  ✓ Order auto-delivered
  ✓ NO invoice creation step required

✅ Test 1.5 PASSED: Auto-delivery verified for internal dentist

🔍 CRITICAL TEST: Verifying internal worksheet NOT in invoice list...
  ✓ Internal worksheet correctly excluded from invoice lists

✅ Test 1.6 PASSED: Internal worksheet not available for invoicing

📝 Updating dentist to requiresInvoicing=true...
  ✓ Dentist updated successfully

✅ Test 2.1 PASSED: Dentist updated to require invoicing

[... continues with Scenario 2 ...]

✅ E2E test suite completed successfully

Test Summary:
  - Scenario 1 (Internal): requiresInvoicing=false → Auto-delivery
  - Scenario 2 (External): requiresInvoicing=true → Manual invoice required

Key Validations:
  ✓ Auto-delivery logic for internal dentists
  ✓ Manual invoice requirement for external dentists
  ✓ Worksheet filtering in invoice lists
  ✓ Complete workflow: Order → Worksheet → QC → Invoice → Delivery
```

## Critical Test Cases

### Test 1.5: Auto-Delivery Verification (Internal)
**Why Critical**: Validates that internal dentist orders bypass invoicing and auto-complete.

**Assertions**:
- Worksheet status = DELIVERED (not QC_APPROVED)
- Order status = DELIVERED
- No invoice creation step occurred

**Business Impact**: Ensures internal work flows efficiently without manual invoice steps.

### Test 2.5: No Auto-Delivery Verification (External)
**Why Critical**: Validates that external dentist orders require manual invoicing.

**Assertions**:
- Worksheet status = QC_APPROVED (not DELIVERED)
- Order status = QC_APPROVED
- Manual invoice creation required

**Business Impact**: Ensures proper invoicing for billable client work.

### Test 1.6 & 2.6: Invoice List Filtering
**Why Critical**: Validates that only appropriate worksheets appear for invoicing.

**Assertions**:
- Internal worksheets: NOT in invoice list
- External worksheets: IN invoice list

**Business Impact**: Prevents accidental invoicing of internal work.

## Integration Points Tested

### Database
- `Dentist.requiresInvoicing` field read/write
- Worksheet status state machine transitions
- Order status cascading updates

### API Endpoints
- `POST /api/dentists` - Create dentist
- `PATCH /api/dentists/[id]` - Update invoice setting
- `POST /api/orders` - Create order
- `POST /api/worksheets` - Create worksheet
- `POST /api/quality-control/[worksheetId]` - QC approval
- `GET /api/worksheets/available-for-invoice` - Filter worksheets
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/[id]` - Finalize invoice

### Business Logic
- Quality control approval triggers
- Auto-delivery vs manual invoice decision logic
- Worksheet availability filtering
- Status state machine enforcement

## Troubleshooting

### Test Fails at Worksheet Creation
**Issue**: Teeth selector or product selection times out

**Solution**:
```typescript
// Increase timeout in helper function
await page.waitForSelector('[data-tooth]', { timeout: 15000 });
```

### Test Fails at QC Approval
**Issue**: QC form fields not found

**Solution**: Ensure QC page is fully implemented and field names match:
```typescript
await page.check('input[name="aesthetics"]');
await page.check('input[name="fit"]');
// etc...
```

### Status Not Updating
**Issue**: Worksheet/order status doesn't change after QC

**Solution**: Check backend logic in `/api/quality-control/[worksheetId]/route.ts`:
```typescript
// Should check dentist.requiresInvoicing
if (dentist.requiresInvoicing === false) {
  // Auto-transition to DELIVERED
} else {
  // Stay in QC_APPROVED
}
```

## Future Enhancements

### Additional Test Scenarios
1. **Mixed Orders**: Create multiple orders (internal + external) and verify filtering
2. **Bulk Invoicing**: Create invoice with multiple external worksheets
3. **Invoice Cancellation**: Cancel invoice and verify worksheet status reverts
4. **Permission Testing**: Test with different user roles (TECHNICIAN, QC_INSPECTOR, INVOICING)

### Performance Testing
```typescript
// Add performance measurements
const startTime = Date.now();
await completeProduction(page, worksheetId);
const endTime = Date.now();
expect(endTime - startTime).toBeLessThan(5000); // Should complete in <5s
```

### Visual Regression
```typescript
// Add screenshot comparisons
await page.screenshot({ path: `screenshots/dentist-${dentistId}.png` });
await expect(page).toHaveScreenshot('dentist-detail.png');
```

## Maintenance Notes

### Updating Test Data
If database schema changes:
1. Update `INTERNAL_DENTIST` object with new required fields
2. Update `WORKSHEET_DATA` if worksheet structure changes
3. Update `QC_DATA` if MDR compliance fields change

### Selector Updates
If UI components change:
1. Update selectors in helper functions
2. Consider using `data-testid` attributes for stability:
```html
<div data-testid="worksheet-status">DELIVERED</div>
```

### Test Reliability
To improve test reliability:
1. Use explicit waits instead of arbitrary timeouts
2. Add retry logic for flaky network requests
3. Implement test data cleanup in `afterAll()`

## Related Documentation

- **Implementation Plan**: `/deliverables/research/IMPLEMENTATION-PLAN.md`
- **Database Schema**: `/prisma/schema.prisma` (line 73: requiresInvoicing field)
- **API Documentation**: `/deliverables/documentation/API-REFERENCE.md`
- **Existing E2E Tests**: `/tests/e2e/internal-dentist-workflow.spec.ts`

## Contact

For questions about this test or the invoice requirement feature:
- **Feature Owner**: Backend Team
- **Test Author**: Claude Code E2E Test Generator
- **Last Updated**: 2026-01-03

---

**Test Status**: ✅ Ready for Execution

**Prerequisites**: ✅ Development server, ✅ Database seeded, ✅ Playwright installed

**Estimated Runtime**: 5-8 minutes

**Critical Tests**: 6 of 14 tests are marked CRITICAL

**Coverage**: Complete workflow from dentist creation through final delivery
