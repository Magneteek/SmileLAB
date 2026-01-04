# Year-End Transitions & Production Deployment Workflow

## Overview

This document explains how the Smilelab MDR system handles year-end counter resets and provides a comprehensive production deployment workflow to ensure zero data loss during updates.

---

## Sequential Numbering Systems

### 1. Order Numbers (Year-Based Auto-Reset)
**Format**: `YYXXX` (e.g., 25001, 25002, 25003...)
- **YY**: Last 2 digits of year (25 for 2025, 26 for 2026)
- **XXX**: 3-digit sequential number (001-999)
- **Auto-reset**: ✅ Automatically resets to 001 each January 1st

**Implementation**: `lib/services/order-service.ts:30`
```typescript
const currentYear = new Date().getFullYear();
const yearSuffix = currentYear.toString().slice(-2); // "25"
const configKey = `next_order_number_${currentYear}`; // "next_order_number_2025"

// When year changes, creates new config key automatically
// 2025: next_order_number_2025 → 25001, 25002, 25003...
// 2026: next_order_number_2026 → 26001, 26002, 26003...
```

**Year-End Transition Example**:
- Last order of 2025: `25239` (December 31, 2025)
- First order of 2026: `26001` (January 1, 2026) ✅ Auto-resets

---

### 2. Invoice Numbers (Year-Based Auto-Reset)
**Format**: `RAC-YYYY-NNN` (e.g., RAC-2025-001, RAC-2025-002, RAC-2025-003...)
- **RAC**: Fixed prefix (Račun - Slovenian for "Invoice")
- **YYYY**: Full 4-digit year (2025, 2026, 2027...)
- **NNN**: 3-digit sequential number (001-999)
- **Auto-reset**: ✅ Automatically resets to 001 each January 1st

**Implementation**: `src/lib/services/invoice-service.ts:610`
```typescript
async function generateInvoiceNumber(invoiceDate: Date): Promise<string> {
  const year = invoiceDate.getFullYear(); // 2025
  const yearPrefix = `${INVOICE_PREFIX}${year}-`; // "RAC-2025-"

  // Query for latest invoice in this year only
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: yearPrefix }, // Only "RAC-2025-*"
      isDraft: false,
    },
    orderBy: { invoiceNumber: 'desc' },
  });

  if (!latestInvoice) {
    return `${yearPrefix}001`; // First invoice of the year
  }

  // Extract number and increment
  const numberPart = latestInvoice.invoiceNumber.replace(yearPrefix, '');
  const nextNumber = parseInt(numberPart, 10) + 1;
  return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
}
```

**Year-End Transition Example**:
- Last invoice of 2025: `RAC-2025-222` (December 31, 2025)
- First invoice of 2026: `RAC-2026-001` (January 1, 2026) ✅ Auto-resets

**How It Works**:
1. Query searches for invoices starting with `RAC-2026-`
2. Finds no results (first invoice of 2026)
3. Returns `RAC-2026-001`

---

### 3. Worksheet Numbers (Year-Based - Tied to Order Number)
**Format**: `DN-YYXXX` (e.g., DN-25001, DN-25002, DN-25003...)
- **DN**: Fixed prefix (Dental/Delovni Nalog - Slovenian for "Work Order")
- **YYXXX**: Matches the order number exactly (inherits year-based format)
- **Auto-reset**: ✅ Automatically resets each year (because order numbers reset)

**Implementation**: `src/lib/services/worksheet-service.ts:79`
```typescript
// Generate worksheet number matching order number (DN-25001, DN-25002, etc.)
const worksheetNumber = `DN-${order.orderNumber}`;
```

**Year-End Reset** (inherited from order numbering):
- Order: `25239` → Worksheet: `DN-25239` (last of 2025)
- Order: `26001` → Worksheet: `DN-26001` (first of 2026) ✅ Auto-resets

**Key Point**: Worksheet numbers are **not** independently generated. They are directly derived from the order number, so they automatically inherit the year-based reset behavior.

---

### 4. Annex XIII Document Numbers (Year-Based - Tied to Worksheet)
**Format**: `MDR-DN-YYXXX` (e.g., MDR-DN-25001, MDR-DN-25002, MDR-DN-25003...)
- **MDR**: Fixed prefix (Medical Device Regulation - EU compliance identifier)
- **DN-YYXXX**: Matches the worksheet number exactly (inherits year-based format)
- **Auto-reset**: ✅ Automatically resets each year (because worksheet numbers reset)

**Implementation**: `lib/pdf/annex-xiii-generator.ts:451`
```typescript
// Generate MDR-compliant document number tied to worksheet (e.g., MDR-DN-25001)
// Format: MDR-{WorksheetNumber} for direct traceability per EU MDR Article 10
const documentNumber = `MDR-${worksheet.worksheetNumber}`;
```

**Year-End Reset** (inherited from worksheet/order numbering):
- Worksheet: `DN-25239` → Document: `MDR-DN-25239` (last of 2025)
- Worksheet: `DN-26001` → Document: `MDR-DN-26001` (first of 2026) ✅ Auto-resets

**MDR Compliance Rationale**:
- **Article 10(9)**: Requires explicit traceability between device and documentation
- **MDR prefix**: Immediately identifies the document as EU MDR Annex XIII compliance documentation
- **Worksheet linkage**: One-to-one relationship ensures perfect forward/reverse traceability
- **10-year retention**: Document number format supports long-term archival requirements

**Key Point**: Annex XIII document numbers are **not** independently generated. They are directly derived from the worksheet number with an "MDR-" prefix, ensuring permanent traceability and automatically inheriting the year-based reset behavior.

---

## Year-End Transition Behavior Summary

| Counter | Format | 2025 End | 2026 Start | Auto-Reset? |
|---------|--------|----------|------------|-------------|
| **Orders** | `YYXXX` | `25239` | `26001` | ✅ Yes |
| **Invoices** | `RAC-YYYY-NNN` | `RAC-2025-222` | `RAC-2026-001` | ✅ Yes |
| **Worksheets** | `DN-YYXXX` | `DN-25239` | `DN-26001` | ✅ Yes (tied to order) |
| **Annex XIII** | `MDR-DN-YYXXX` | `MDR-DN-25239` | `MDR-DN-26001` | ✅ Yes (tied to worksheet) |

**No Manual Intervention Required**: The system automatically handles year transitions. Just keep running normally on January 1st.

**How Each System Resets**:
1. **Orders**: Queries `next_order_number_2026` config key (creates if doesn't exist) → Returns `26001`
2. **Invoices**: Queries for invoices starting with `RAC-2026-` (finds none) → Returns `RAC-2026-001`
3. **Worksheets**: Inherits order number directly → `DN-${orderNumber}` → Returns `DN-26001`
4. **Annex XIII**: Inherits worksheet number directly → `MDR-${worksheetNumber}` → Returns `MDR-DN-26001`

**Critical Points**:
- **Worksheets** are **1:1 tied to orders**. Each worksheet number matches its order number exactly (with DN- prefix). When you create a worksheet from order `26001`, it automatically becomes `DN-26001`.
- **Annex XIII documents** are **1:1 tied to worksheets**. Each document number matches its worksheet number exactly (with MDR- prefix). When you generate documentation for worksheet `DN-26001`, it automatically becomes `MDR-DN-26001`.

---

## Production Deployment Workflow

### Pre-Deployment Checklist

#### 1. Create Full Database Backup
```bash
# On production server
pg_dump -U smilelab_user -d smilelab_mdr > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has size > 0
ls -lh backup_*.sql

# Copy backup to safe location (Digital Ocean Spaces, S3, etc.)
# NEVER deploy without a verified backup!
```

#### 2. Test in Staging Environment (If Available)
- Deploy changes to staging database first
- Run full test suite
- Test critical workflows:
  - Create order → worksheet → QC → invoice
  - Material LOT assignment
  - PDF generation
  - Email sending

#### 3. Plan Deployment Window
- **Recommended**: Outside business hours (evenings or weekends)
- **Notify users**: System will be down for 10-15 minutes
- **Prepare rollback plan**: Keep previous version ready

---

### Safe Deployment Process

#### Phase 1: Code Deployment (No Schema Changes)

**Safe Changes** (can deploy without downtime):
- Bug fixes in business logic
- UI component updates
- New features that don't touch database
- Security patches
- Dependency updates (non-breaking)

**Deployment Steps**:
```bash
# 1. Pull latest code from Git
git pull origin main

# 2. Install dependencies
npm install

# 3. Build production bundle
npm run build

# 4. Restart application (with PM2 or systemd)
pm2 restart smilelab-mdr
# OR
systemctl restart smilelab-mdr

# 5. Verify application started successfully
pm2 logs smilelab-mdr --lines 50
curl -I http://localhost:3000  # Should return 200 OK
```

**Zero Downtime Deployment** (Blue-Green Strategy):
```bash
# 1. Start new version on different port (e.g., 3001)
PORT=3001 npm run start

# 2. Verify new version is healthy
curl -I http://localhost:3001

# 3. Update Nginx to point to new port
sudo nano /etc/nginx/sites-available/smilelab-mdr
# Change proxy_pass to http://localhost:3001

# 4. Reload Nginx (zero downtime)
sudo nginx -t && sudo nginx -s reload

# 5. Stop old version
pm2 stop smilelab-mdr-old
```

---

#### Phase 2: Database Migrations (Schema Changes)

**Risky Changes** (require downtime and backups):
- Adding/removing columns
- Changing data types
- Adding constraints
- Index changes
- Relationship modifications

**Safe Migration Strategy**:

**Option A: Additive Changes (Backward Compatible)**
```bash
# Example: Adding a new optional column
# 1. Add column as nullable first
# Migration file:
ALTER TABLE orders ADD COLUMN new_field VARCHAR(255);

# 2. Deploy new code that works with and without the field
# 3. Backfill data if needed
UPDATE orders SET new_field = 'default_value' WHERE new_field IS NULL;

# 4. Make column required (optional, in future deployment)
ALTER TABLE orders ALTER COLUMN new_field SET NOT NULL;
```

**Option B: Multi-Step Migrations (Complex Changes)**

Example: Renaming a column (requires 3 deployments)

**Step 1 - Add New Column**:
```sql
-- Migration 1
ALTER TABLE worksheets ADD COLUMN device_desc TEXT;
UPDATE worksheets SET device_desc = device_description;
```
```typescript
// Code: Write to BOTH columns
deviceDescription: data.deviceDesc,
device_desc: data.deviceDesc,
```

**Step 2 - Switch Reads to New Column**:
```typescript
// Code: Read from new column, write to both
const desc = worksheet.device_desc || worksheet.deviceDescription;
```

**Step 3 - Remove Old Column**:
```sql
-- Migration 3 (after verifying no issues)
ALTER TABLE worksheets DROP COLUMN device_description;
```
```typescript
// Code: Use only new column
const desc = worksheet.device_desc;
```

---

#### Phase 3: Prisma Migration Deployment

**Standard Prisma Migration**:
```bash
# 1. Create backup (CRITICAL!)
pg_dump -U smilelab_user -d smilelab_mdr > backup_before_migration.sql

# 2. Stop application (prevent inconsistent state)
pm2 stop smilelab-mdr

# 3. Run migration
npx prisma migrate deploy

# 4. Verify migration succeeded
psql -U smilelab_user -d smilelab_mdr -c "\dt"  # List tables
psql -U smilelab_user -d smilelab_mdr -c "\d worksheets"  # Verify schema

# 5. Generate Prisma Client
npx prisma generate

# 6. Build application
npm run build

# 7. Start application
pm2 start smilelab-mdr

# 8. Verify application health
pm2 logs smilelab-mdr --lines 50
curl -I http://localhost:3000
```

**If Migration Fails** (Rollback):
```bash
# 1. Stop application
pm2 stop smilelab-mdr

# 2. Restore database from backup
psql -U smilelab_user -d smilelab_mdr < backup_before_migration.sql

# 3. Revert code to previous version
git reset --hard HEAD~1

# 4. Rebuild
npm install
npm run build
npx prisma generate

# 5. Restart application
pm2 start smilelab-mdr

# 6. Verify old version is working
curl -I http://localhost:3000
```

---

### Critical Data Validation After Deployment

**Verify Core Workflows**:
```bash
# 1. Check order numbering is correct
psql -U smilelab_user -d smilelab_mdr -c "SELECT order_number, created_at FROM orders ORDER BY created_at DESC LIMIT 5;"

# 2. Check invoice numbering is correct
psql -U smilelab_user -d smilelab_mdr -c "SELECT invoice_number, created_at FROM invoices ORDER BY created_at DESC LIMIT 5;"

# 3. Check worksheet numbering is correct
psql -U smilelab_user -d smilelab_mdr -c "SELECT worksheet_number, created_at FROM worksheets ORDER BY created_at DESC LIMIT 5;"

# 4. Verify SystemConfig counters are intact
psql -U smilelab_user -d smilelab_mdr -c "SELECT key, value FROM system_config WHERE key LIKE 'next_%';"
```

**Example Output (Verify These Values)**:
```
                 key                 |  value
-------------------------------------+---------
 next_order_number_2025              | 240
```

**Note**: Worksheets do NOT use a SystemConfig counter. They inherit their number directly from the order number (`DN-${orderNumber}`).

---

## Year-End Transition Testing (Before December 31)

**Test Year Transition in Staging**:

```sql
-- Temporarily change system date in test database
-- (This does NOT affect production!)

-- Create test invoices with December 31 date
INSERT INTO invoices (invoice_number, invoice_date, ...)
VALUES ('RAC-2025-222', '2025-12-31', ...);

-- Create test invoices with January 1 date
INSERT INTO invoices (invoice_number, invoice_date, ...)
VALUES ('RAC-2026-001', '2026-01-01', ...);

-- Verify generateInvoiceNumber() returns correct values
-- For 2025-12-31: Should return RAC-2025-223
-- For 2026-01-01: Should return RAC-2026-002
```

**Recommended: Run This Test in November 2025**
- Create staging database copy
- Manually test year transitions:
  - Create orders for 2025-12-31 → Verify order number `25XXX`
  - Create orders for 2026-01-01 → Verify order number `26001`
  - Create worksheets from these orders → Verify `DN-25XXX` and `DN-26001`
  - Create invoices for these dates → Verify `RAC-2025-XXX` and `RAC-2026-001`
- Verify all three numbering systems reset correctly
- Document any issues

---

## Production Monitoring Post-Deployment

**Critical Metrics to Monitor**:

1. **Application Logs**:
```bash
pm2 logs smilelab-mdr --lines 100
# Look for errors, warnings, database connection issues
```

2. **Database Connections**:
```bash
psql -U smilelab_user -d smilelab_mdr -c "SELECT count(*) FROM pg_stat_activity WHERE datname='smilelab_mdr';"
# Should be < 10 connections normally
```

3. **Disk Space**:
```bash
df -h
# Ensure /var/lib/postgresql has > 20% free space
```

4. **Memory Usage**:
```bash
free -h
pm2 monit
# Ensure application isn't consuming > 80% RAM
```

---

## Automated Backup Strategy

**Daily Automated Backups** (Recommended):

```bash
# Create backup script: /home/smilelab/backup-db.sh
#!/bin/bash
BACKUP_DIR="/home/smilelab/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="smilelab_mdr_${TIMESTAMP}.sql"

# Create backup
pg_dump -U smilelab_user -d smilelab_mdr > "${BACKUP_DIR}/${FILENAME}"

# Compress backup
gzip "${BACKUP_DIR}/${FILENAME}"

# Delete backups older than 30 days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete

# Upload to Digital Ocean Spaces (or S3)
s3cmd put "${BACKUP_DIR}/${FILENAME}.gz" s3://smilelab-backups/

echo "Backup completed: ${FILENAME}.gz"
```

**Schedule with Cron**:
```bash
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * /home/smilelab/backup-db.sh >> /home/smilelab/backup.log 2>&1
```

**Verify Backups Are Running**:
```bash
ls -lh /home/smilelab/backups/
tail -f /home/smilelab/backup.log
```

---

## Rollback Procedures

### Scenario 1: Code Bug (No Schema Changes)

**Quick Rollback** (< 5 minutes):
```bash
# 1. Stop current version
pm2 stop smilelab-mdr

# 2. Revert code
git reset --hard <previous-commit-hash>

# 3. Rebuild
npm install
npm run build

# 4. Restart
pm2 start smilelab-mdr

# 5. Verify
curl -I http://localhost:3000
```

---

### Scenario 2: Migration Failed

**Database Rollback**:
```bash
# 1. Stop application
pm2 stop smilelab-mdr

# 2. Restore database
psql -U smilelab_user -d smilelab_mdr < backup_before_migration.sql

# 3. Revert code
git reset --hard <previous-commit-hash>

# 4. Rebuild
npm install
npm run build
npx prisma generate

# 5. Restart
pm2 start smilelab-mdr
```

---

### Scenario 3: Data Corruption Detected

**Full System Restore**:
```bash
# 1. Stop application
pm2 stop smilelab-mdr

# 2. Drop and recreate database
psql -U postgres -c "DROP DATABASE smilelab_mdr;"
psql -U postgres -c "CREATE DATABASE smilelab_mdr OWNER smilelab_user;"

# 3. Restore from latest VERIFIED backup
psql -U smilelab_user -d smilelab_mdr < backup_verified_clean.sql

# 4. Verify data integrity
psql -U smilelab_user -d smilelab_mdr -c "SELECT count(*) FROM orders;"
psql -U smilelab_user -d smilelab_mdr -c "SELECT count(*) FROM worksheets;"
psql -U smilelab_user -d smilelab_mdr -c "SELECT count(*) FROM invoices;"

# 5. Revert code to matching version
git reset --hard <matching-commit>

# 6. Rebuild and restart
npm install
npm run build
npx prisma generate
pm2 start smilelab-mdr
```

---

## Security Best Practices for Production

### 1. Environment Variables
**NEVER commit secrets to Git!**

```bash
# /home/smilelab/.env (production)
DATABASE_URL="postgresql://smilelab_user:STRONG_PASSWORD@localhost:5432/smilelab_mdr"
NEXTAUTH_SECRET="GENERATE_WITH_openssl_rand_base64_32"
SMTP_USER="smtp@smilelab.si"
SMTP_PASS="APP_SPECIFIC_PASSWORD"
```

**Generate Secure Secrets**:
```bash
# NextAuth secret (32 bytes)
openssl rand -base64 32

# Database password (20 characters)
openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c 20
```

---

### 2. File Permissions
```bash
# Restrict .env file
chmod 600 /home/smilelab/.env
chown smilelab:smilelab /home/smilelab/.env

# Restrict PDF storage directory
chmod 750 /var/www/smilelab/pdfs
chown smilelab:www-data /var/www/smilelab/pdfs
```

---

### 3. Database Access Control
```sql
-- Production database user should NOT have superuser
-- Grant only necessary permissions

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smilelab_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smilelab_user;
REVOKE CREATE ON SCHEMA public FROM smilelab_user;
```

---

## Emergency Contact Information

**Keep This Information Updated**:

- **Server Provider**: Digital Ocean (login: admin@smilelab.si)
- **Database Admin**: [Your DBA contact]
- **Hosting Support**: support@digitalocean.com
- **Application Developer**: [Your contact]

**Emergency Backup Locations**:
- Primary: Digital Ocean Spaces (s3://smilelab-backups/)
- Secondary: Local server (/home/smilelab/backups/)
- Offline: External hard drive (office safe)

---

## Summary Checklist

**Before Every Deployment**:
- [ ] Create full database backup
- [ ] Test in staging environment (if available)
- [ ] Review migration files for risks
- [ ] Plan deployment window (notify users)
- [ ] Prepare rollback plan
- [ ] Document what's changing

**During Deployment**:
- [ ] Stop application (if schema changes)
- [ ] Run migrations
- [ ] Generate Prisma Client
- [ ] Build application
- [ ] Start application
- [ ] Verify application health

**After Deployment**:
- [ ] Check application logs for errors
- [ ] Verify numbering sequences (orders, invoices, worksheets)
- [ ] Test critical workflows manually
- [ ] Monitor performance for 24 hours
- [ ] Document any issues

**Year-End Specific (December)**:
- [ ] Test year transitions in staging
- [ ] Verify order numbering will reset (25XXX → 26001)
- [ ] Verify invoice numbering will reset (RAC-2025-XXX → RAC-2026-001)
- [ ] Verify worksheet numbering will reset (DN-25XXX → DN-26001, tied to order)
- [ ] Extra backup before December 31

---

**Document Version**: 1.0
**Last Updated**: 2025-01-01
**Next Review**: Before deployment or November 2025 (year-end testing)
