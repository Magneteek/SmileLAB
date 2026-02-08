# Quick Reset Commands

## 🚀 Complete Reset Process (3 Steps)

### 1️⃣ Navigate to Project
```bash
cd /Users/kris/CLAUDEtools/ORCHESTRAI/projects/smilelab-ec615192-0f63-48d1-96d5-44834d460e3d/deliverables/development/dental-lab-mdr
```

### 2️⃣ Create Backup (REQUIRED!)
```bash
./scripts/backup-database.sh
```

### 3️⃣ Reset Database
```bash
npx tsx prisma/reset-for-production.ts
```

---

## ✅ What You'll Keep
- ✅ Products (pricing list)
- ✅ Product prices
- ✅ User accounts
- ✅ Lab configuration
- ✅ Bank accounts
- ✅ Material types

## 🗑️ What Gets Deleted
- 🗑️ All orders (001, 002, 003...)
- 🗑️ All worksheets (DN-XXX)
- 🗑️ All invoices
- 🗑️ All dentists/patients
- 🗑️ All documents (MDR Annex, invoices)
- 🗑️ All inventory/stock

## 🔢 What Gets Reset
- Order numbers → `001`
- Worksheet numbers → `DN-001`
- Invoice numbers → `RAC-2025-001`

---

## 🔄 If You Need to Restore

```bash
psql -h localhost -p 5432 -U postgres -d smilelab_mdr -f ./backups/smilelab_backup_YYYYMMDD_HHMMSS.sql
```

Replace `YYYYMMDD_HHMMSS` with your backup file timestamp.

---

**📖 Full Guide:** See `PRODUCTION-RESET-GUIDE.md` for detailed instructions
