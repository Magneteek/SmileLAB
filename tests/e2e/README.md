# E2E Tests - Internal Dentist Workflow

## Overview

Comprehensive Playwright E2E test suite that validates the complete workflow for both internal and external dentists with the `requiresInvoicing` toggle feature.

## Test Coverage

### Scenario 1: Internal Dentist (No Invoice Required)
1. ✅ Create dentist with `requiresInvoicing = false`
2. ✅ Create order for internal dentist
3. ✅ Create worksheet with teeth selection and products
4. ✅ Complete production workflow
5. ✅ Approve QC with MDR compliance fields
6. ✅ Verify auto-delivery (worksheet and order → DELIVERED)
7. ✅ Verify worksheet does NOT appear in invoice creation lists

### Scenario 2: External Dentist (Invoice Required)
1. ✅ Update same dentist to `requiresInvoicing = true`
2. ✅ Create new order for external dentist
3. ✅ Create worksheet with complete workflow
4. ✅ Complete production and QC approval
5. ✅ Verify worksheet stays QC_APPROVED (no auto-delivery)
6. ✅ Verify worksheet DOES appear in invoice creation lists
7. ✅ Create invoice for worksheet
8. ✅ Finalize invoice and verify delivery

## Prerequisites

### 1. Install Playwright

```bash
npm install -D @playwright/test @types/node
npx playwright install
```

### 2. Database Setup

Ensure you have a test database running:

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Run migrations
npx prisma migrate deploy

# Seed test data (including admin user)
npx prisma db seed
```

### 3. Environment Configuration

Create a `.env.test` file or update `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smilelab_mdr_test"

# Application
BASE_URL="http://localhost:3210"

# Test Admin User
TEST_ADMIN_EMAIL="admin@smilelab.si"
TEST_ADMIN_PASSWORD="admin123"
```

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run tests in debug mode

```bash
npm run test:e2e:debug
```

### Run specific test file

```bash
npx playwright test tests/e2e/internal-dentist-workflow.spec.ts
```

### Run specific test

```bash
npx playwright test tests/e2e/internal-dentist-workflow.spec.ts -g "Create internal dentist"
```

### View test report

```bash
npx playwright show-report test-results/html
```

## Test Data

The tests automatically generate unique test data using timestamps to avoid conflicts:

- **Dentist**: `E2E Test Clinic {timestamp}`
- **Email**: `e2e.test.{timestamp}@example.com`
- **Patient**: E2E Patient

This ensures tests can run multiple times without cleanup.

## Test Structure

### Helper Functions

- `login(page)` - Authenticate as admin user
- `createDentist(page, requiresInvoicing)` - Create dentist with invoice setting
- `updateDentistInvoicingSetting(page, dentistId, requiresInvoicing)` - Toggle invoice requirement
- `createOrder(page, dentistId)` - Create order for dentist
- `createWorksheet(page, orderId)` - Create worksheet with teeth and products
- `completeProduction(page, worksheetId)` - Move through production stages
- `approveQC(page, worksheetId)` - Complete QC inspection
- `createInvoice(page, worksheetIds)` - Generate invoice

### Test Flow

```
1. Internal Dentist Flow
   └─ Create Dentist (requiresInvoicing=false)
      └─ Create Order
         └─ Create Worksheet
            └─ Complete Production
               └─ Approve QC
                  └─ Auto-Deliver ✅
                     └─ Not in Invoice Lists ✅

2. External Dentist Flow
   └─ Update Dentist (requiresInvoicing=true)
      └─ Create Order
         └─ Create Worksheet
            └─ Complete Production
               └─ Approve QC
                  └─ Stays QC_APPROVED ✅
                     └─ Appears in Invoice Lists ✅
                        └─ Create Invoice
                           └─ Finalize Invoice
                              └─ Delivered ✅
```

## Debugging

### Enable trace viewer

Traces are automatically captured on test failure. To view:

```bash
npx playwright show-trace test-results/.../trace.zip
```

### Enable debug logs

Update the test to include console logs:

```typescript
test.use({
  trace: 'on',
  video: 'on',
  screenshot: 'on',
});
```

### Run with Playwright Inspector

```bash
PWDEBUG=1 npx playwright test tests/e2e/internal-dentist-workflow.spec.ts
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
          retention-days: 30
```

## Troubleshooting

### Test fails with "Element not found"

- Check that selectors match your UI components
- Ensure the application is fully loaded before interactions
- Use `await page.waitForSelector()` for dynamic elements

### Test fails with "Timeout"

- Increase timeout in `playwright.config.ts`
- Check database connection and seed data
- Verify the development server is running

### Authentication fails

- Verify test admin credentials in `.env.test`
- Check that seed script created the admin user
- Ensure session storage is working

### Database state issues

- Reset database between test runs if needed
- Use transactions in tests for isolation
- Clean up test data in `afterAll` hooks

## Best Practices

1. **Independent Tests**: Each test should be runnable independently
2. **Unique Data**: Use timestamps for unique test data
3. **Clear Assertions**: Use descriptive expect messages
4. **Page Objects**: Consider extracting page interactions to page objects
5. **Error Screenshots**: Keep screenshots on failure for debugging
6. **Cleanup**: Clean up test data to avoid database bloat

## Next Steps

1. Add more test scenarios:
   - Multiple worksheets in single invoice
   - Rejected QC workflow
   - Draft invoice handling
   - Payment status transitions

2. Add API tests:
   - Direct API endpoint testing
   - Contract testing
   - Performance testing

3. Visual regression tests:
   - Screenshot comparison
   - PDF document validation
   - Responsive design testing

## Support

For issues or questions about the E2E tests:
- Check test output in `test-results/html`
- Review Playwright documentation: https://playwright.dev
- Check application logs for API errors
