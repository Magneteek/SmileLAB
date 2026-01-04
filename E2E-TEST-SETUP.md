# E2E Test Setup Guide

## Quick Start

### 1. Install Playwright

```bash
npm install
npx playwright install
```

This will install Playwright browsers (Chromium, Firefox, WebKit).

### 2. Configure Test Environment

Update your `.env.local` or create `.env.test`:

```env
# Database (use a separate test database)
DATABASE_URL="postgresql://user:password@localhost:5432/smilelab_mdr_test"

# Application URL
BASE_URL="http://localhost:3210"

# Test Admin Credentials (should match your seed data)
TEST_ADMIN_EMAIL="admin@smilelab.si"
TEST_ADMIN_PASSWORD="admin123"
```

### 3. Prepare Test Database

```bash
# Run migrations on test database
npx prisma migrate deploy

# Seed test data (admin user required)
npx prisma db seed
```

### 4. Run the Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode (step through)
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## Test Scenarios Covered

### ✅ Internal Dentist Workflow (No Invoice)

1. Create dentist with "Requires Invoice" unchecked
2. Create order → worksheet → production → QC approval
3. Verify auto-delivery (worksheet + order → DELIVERED)
4. Verify worksheet excluded from invoice lists

### ✅ External Dentist Workflow (With Invoice)

1. Update same dentist to require invoicing
2. Create order → worksheet → production → QC approval
3. Verify worksheet stays QC_APPROVED (no auto-delivery)
4. Verify worksheet appears in invoice lists
5. Create invoice → finalize → verify delivery

## Test Output

After running tests, you'll find:

- **HTML Report**: `test-results/html/index.html`
- **JSON Results**: `test-results/results.json`
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)
- **Traces**: `test-results/` (on failure)

## Viewing Test Results

```bash
# Open HTML report in browser
npm run test:e2e:report

# View trace for debugging
npx playwright show-trace test-results/.../trace.zip
```

## Important Notes

### Test User Credentials

The tests require an admin user with these credentials (update in seed.ts):

```typescript
{
  email: 'admin@smilelab.si',
  password: 'admin123',
  role: 'ADMIN'
}
```

### Selectors

The tests use various selector strategies:

- `text=` - Text content
- `[name="fieldName"]` - Form field names
- `[data-testid="..."]` - Test IDs (recommended to add)
- `button:has-text("...")` - Button with specific text

If selectors don't match your UI, update them in the test file.

### Test Data Cleanup

Tests automatically generate unique data using timestamps, so no manual cleanup is needed. However, you may want to periodically clean test data:

```sql
DELETE FROM "Dentist" WHERE "clinicName" LIKE 'E2E Test Clinic%';
DELETE FROM "Order" WHERE "dentistId" IN (SELECT "id" FROM "Dentist" WHERE "deletedAt" IS NOT NULL);
```

## Troubleshooting

### "Browser not found"

```bash
npx playwright install
```

### "Element not found"

- Check selector matches your UI
- Add `await page.waitForSelector('...')`
- Use Playwright Inspector: `PWDEBUG=1 npm run test:e2e`

### "Authentication failed"

- Verify admin user exists in database
- Check credentials match seed data
- Ensure NextAuth is configured correctly

### "Timeout waiting for page"

- Increase timeout in `playwright.config.ts`
- Check dev server is running on port 3210
- Verify database connection

## CI/CD Integration

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: smilelab_mdr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Setup database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/smilelab_mdr_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/smilelab_mdr_test
          BASE_URL: http://localhost:3210

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: test-results/
          retention-days: 30
```

## Next Steps

1. **Add more test scenarios**:
   - Multiple worksheets per invoice
   - QC rejection workflow
   - Draft invoice handling
   - Payment status changes

2. **Add API tests**:
   - Direct endpoint testing
   - Contract testing with Pact

3. **Add visual regression**:
   - Screenshot comparison
   - PDF validation

4. **Improve selectors**:
   - Add `data-testid` attributes to UI components
   - Use page object model pattern

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Strategy Guide](./tests/e2e/README.md)
- [Project CLAUDE.md](./CLAUDE.md)
