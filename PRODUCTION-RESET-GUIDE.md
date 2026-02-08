# Production Database Reset Guide

## 🎯 Overview

This guide will help you reset your Smilelab MDR database for production use while **preserving your pricing list and company settings**.

### ✅ What Gets PRESERVED

- **✅ Products** - All pricing list items
- **✅ Product price history** - Historical price changes
- **✅ Materials** - Material types (ceramic, metal, resin, etc.)
- **✅ User accounts** - Admin, technician accounts (you can still log in!)
- **✅ Lab configuration** - Company info, responsible person, digital signature
- **✅ Bank accounts** - All bank account details for invoices
- **✅ System settings** - General configuration

### 🗑️ What Gets DELETED

- **🗑️ Orders** - All test orders
- **🗑️ Worksheets** - All test worksheets (DN-XXX)
- **🗑️ Invoices** - All test invoices
- **🗑️ Dentists** - All dentist/clinic records
- **🗑️ Patients** - All patient records
- **🗑️ Documents** - All MDR Annex XIII documents and invoice PDFs
- **🗑️ Material lots** - All inventory/stock arrivals (resets to zero stock)
- **🗑️ QC records** - All quality control records
- **🗑️ Email logs** - All email delivery logs
- **🗑️ Audit logs** - All audit trail entries
- **🗑️ SOPs** - All standard operating procedures

### 🔢 What Gets RESET

- **Order numbering** → Resets to `001`
- **Worksheet numbering** → Resets to `DN-001`
- **Invoice numbering** → Resets to `RAC-2025-001` (or current year)

---

## 📋 Step-by-Step Instructions

### Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL client tools** installed (`pg_dump` command available)
3. **Database access** - DATABASE_URL configured in `.env` file
4. **tsx package** - Will be installed automatically if missing

### Step 1: Backup Current Database (CRITICAL!)

**⚠️ ALWAYS CREATE A BACKUP FIRST!**

```bash
# Navigate to the dental-lab-mdr directory
cd /path/to/dental-lab-mdr

# Run the backup script
./scripts/backup-database.sh
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Backup created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Backup location: ./backups/smilelab_backup_20250208_143022.sql
📦 Backup size: 2.4M
📅 Timestamp: 20250208_143022

💡 To restore this backup later:
   psql -h localhost -p 5432 -U postgres -d smilelab_mdr -f ./backups/smilelab_backup_20250208_143022.sql

✅ You can now safely run the production reset script
```

**✅ Verify backup created:**
```bash
ls -lh backups/
```

You should see your backup file with today's timestamp.

---

### Step 2: Install tsx (if not already installed)

```bash
npm install -D tsx
```

Or use npx (will download temporarily):
```bash
npx tsx --version
```

---

### Step 3: Run the Production Reset Script

**⚠️ THIS WILL DELETE DATA! Make sure you have a backup!**

```bash
# Run the reset script
npx tsx prisma/reset-for-production.ts
```

**Expected output:**
```
🚀 Starting production database reset...

📋 Step 1: Deleting transactional data...
   ✅ Deleted 5 SOP acknowledgments
   ✅ Deleted 3 SOPs
   ✅ Deleted 12 email logs
   ✅ Deleted 45 invoice line items
   ✅ Deleted 18 invoices
   ✅ Deleted 23 documents
   ✅ Deleted 42 quality control records
   ✅ Deleted 87 worksheet-material associations
   ✅ Deleted 156 worksheet-product-material associations
   ✅ Deleted 98 worksheet products
   ✅ Deleted 234 worksheet teeth selections
   ✅ Deleted 67 worksheets
   ✅ Deleted 54 orders
   ✅ Deleted 89 material lots (inventory)
   ✅ Deleted 123 patients
   ✅ Deleted 45 dentists
   ✅ Deleted 456 audit log entries
   ✅ Deleted 2 password reset tokens

✅ Step 1 complete: All transactional data deleted

🔢 Step 2: Resetting auto-numbering sequences...
   ✅ Order numbering reset to 001
   ✅ Worksheet numbering reset to DN-001
   ✅ Invoice numbering reset to RAC-2025-001

✅ Step 2 complete: Auto-numbering sequences reset

📊 Step 3: Summary of preserved data...
   ✅ 87 products preserved (pricing list)
   ✅ 45 price history records preserved
   ✅ 23 material types preserved (master data)
   ✅ 2 user accounts preserved
   ✅ 1 lab configuration records preserved
   ✅ 2 bank accounts preserved
   ✅ 5 system configuration entries preserved

✅ Step 3 complete: Data preservation verified

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ DATABASE RESET COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Your database is now ready for production use!
```

---

### Step 4: Verify the Reset

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Log in with your existing credentials:**
   - Email: `info@dentro.si` (or your admin email)
   - Password: Your existing password

3. **Verify preserved data:**
   - ✅ Go to **Pricing** page - You should see all your products
   - ✅ Go to **Settings** - Lab configuration should still be there
   - ✅ Check **Materials** - Material types should exist (but no stock)

4. **Verify deleted data:**
   - ✅ Go to **Orders** - Should show "No orders found"
   - ✅ Go to **Dentists** - Should show "No dentists found"
   - ✅ Go to **Invoices** - Should show "No invoices found"

5. **Verify reset numbering:**
   - ✅ Create a new order - Should get number `001`
   - ✅ Create a worksheet - Should get `DN-001`

---

## 🔄 If Something Goes Wrong

### Restore from Backup

If you need to restore your data from the backup:

```bash
# Stop the application
npm run dev  # (press Ctrl+C to stop)

# Restore database from backup
psql -h localhost -p 5432 -U postgres -d smilelab_mdr -f ./backups/smilelab_backup_YYYYMMDD_HHMMSS.sql

# Restart the application
npm run dev
```

Replace `YYYYMMDD_HHMMSS` with your actual backup timestamp.

---

## 📝 Post-Reset Checklist

After resetting the database, you should:

1. **✅ Add your first real dentist/clinic**
   - Go to Dentists → Add New Dentist
   - Fill in all required details

2. **✅ Add material stock arrivals**
   - Go to Materials → Select material → Add Stock
   - Enter LOT numbers, expiry dates, quantities

3. **✅ Review lab configuration**
   - Go to Settings → Lab Configuration
   - Verify company details, responsible person, digital signature

4. **✅ Test the workflow**
   - Create a real order (will be `001`)
   - Create worksheet (`DN-001`)
   - Complete QC approval
   - Generate invoice (`RAC-2025-001`)

5. **✅ Configure email service** (if not done yet)
   - Set SMTP credentials in `.env` file
   - Test sending an invoice via email

---

## ⚙️ Environment Variables

Make sure these are set in your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smilelab_mdr"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # Or your production URL
NEXTAUTH_SECRET="your-secret-key-here"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Puppeteer (PDF generation)
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

---

## 🚨 Important Notes

1. **⚠️ ALWAYS BACKUP BEFORE RESET!**
   - The reset script is irreversible
   - Backup files are stored in `./backups/`
   - Keep backups for at least 30 days

2. **User Accounts are Preserved**
   - You can still log in with existing credentials
   - If you want to reset passwords, do it manually after reset

3. **Pricing List is Safe**
   - All products and prices are preserved
   - Price history is maintained for auditing

4. **Material Master Data Preserved**
   - Material types (ceramic, metal, etc.) are kept
   - Only inventory/stock arrivals are deleted
   - You'll need to re-add stock arrivals for production

5. **Auto-Numbering**
   - Orders start at `001`
   - Worksheets start at `DN-001`
   - Invoices start at `RAC-2025-001` (current year)

---

## 📞 Support

If you encounter any issues during the reset:

1. Check that PostgreSQL is running
2. Verify DATABASE_URL in `.env` is correct
3. Ensure you have database permissions
4. Check the backup was created successfully
5. Review the error messages in the console

For technical support, refer to the CLAUDE.md file in the project root.

---

**Last Updated:** 2025-02-08
**Script Version:** 1.0
**Tested On:** PostgreSQL 15+, Node.js 18+
