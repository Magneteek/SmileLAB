# Reset Production Server Database

## 🎯 Overview

This guide shows you how to reset your **deployed production database** on your server (Digital Ocean, etc.) while preserving pricing lists and settings.

---

## 📋 Prerequisites

1. **SSH access** to your production server
2. **Server credentials** (IP address, username, password/SSH key)
3. **App directory path** on the server (e.g., `/var/www/dental-lab-mdr`)

---

## 🚀 Step-by-Step Instructions

### Step 1: Connect to Your Production Server

```bash
# Replace with your actual server details
ssh username@your-server-ip

# Example:
# ssh root@159.89.123.456
# or
# ssh deploy@smilelab.yourdomain.com
```

### Step 2: Navigate to App Directory

```bash
# Navigate to where your app is installed
cd /path/to/dental-lab-mdr

# Common locations:
# cd /var/www/dental-lab-mdr
# cd /home/deploy/dental-lab-mdr
# cd ~/dental-lab-mdr
```

### Step 3: Check Your Database Connection

```bash
# View your current DATABASE_URL (it should point to production DB, not localhost)
cat .env | grep DATABASE_URL

# Expected output (production):
# DATABASE_URL="postgresql://user:password@localhost:5432/smilelab_production"
# or
# DATABASE_URL="postgresql://user:password@db.example.com:5432/smilelab_production"
```

**⚠️ IMPORTANT:** Make sure DATABASE_URL points to your **production database**, not localhost!

### Step 4: Create Backup (CRITICAL!)

```bash
# Option A: If pg_dump is available on server
./scripts/backup-database.sh

# Option B: Use Prisma backup (always works)
npx tsx scripts/backup-with-prisma.ts
```

**Verify backup was created:**
```bash
ls -lh backups/
```

You should see a backup file with today's timestamp.

### Step 5: Reset Database for Production

```bash
# Run the reset script
npx tsx prisma/reset-for-production.ts
```

**Expected output:**
```
🚀 Starting production database reset...

📋 Step 1: Deleting transactional data...
   ✅ Deleted 67 worksheets
   ✅ Deleted 54 orders
   ✅ Deleted 18 invoices
   ... (more deletions)

✅ Step 1 complete: All transactional data deleted

🔢 Step 2: Resetting auto-numbering sequences...
   ✅ Order numbering reset to 001
   ✅ Worksheet numbering reset to DN-001
   ✅ Invoice numbering reset to RAC-2025-001

✅ Step 2 complete: Auto-numbering sequences reset

📊 Step 3: Summary of preserved data...
   ✅ 87 products preserved (pricing list)
   ✅ 2 user accounts preserved
   ✅ 1 lab configuration records preserved
   ... (more preserved data)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ DATABASE RESET COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 6: Restart Your App (If Needed)

```bash
# If using PM2
pm2 restart dental-lab-mdr

# If using systemd
sudo systemctl restart dental-lab-mdr

# If using Docker
docker-compose restart
```

### Step 7: Verify the Reset

1. **Open your production app in browser:**
   ```
   https://your-domain.com
   ```

2. **Log in** with your existing credentials

3. **Check preserved data:**
   - ✅ Products (pricing list) should still be there
   - ✅ Lab configuration should be intact

4. **Check deleted data:**
   - ✅ Orders should be empty
   - ✅ Dentists should be empty
   - ✅ Invoices should be empty

5. **Create a test order:**
   - Should get number `001` ✅
   - Create worksheet: should get `DN-001` ✅

### Step 8: Exit SSH

```bash
exit
```

---

## 🔄 If Something Goes Wrong

### Restore from Backup

If you need to restore your production database:

```bash
# SSH back into server
ssh username@your-server-ip

# Navigate to app directory
cd /path/to/dental-lab-mdr

# Restore from SQL backup (if you used pg_dump)
psql -h localhost -p 5432 -U your_db_user -d smilelab_production -f ./backups/smilelab_backup_YYYYMMDD_HHMMSS.sql

# Or restore from Prisma JSON backup (requires custom restore script)
# The JSON backup can be used to manually re-import data if needed
```

---

## 📝 Post-Reset Production Checklist

1. **✅ Test login** - Verify you can access the app
2. **✅ Check pricing list** - All products should be there
3. **✅ Add first real dentist** - Add your first actual client
4. **✅ Add material stock** - Replenish inventory
5. **✅ Create test order** - Verify numbering starts at 001
6. **✅ Complete test workflow** - Order → Worksheet → QC → Invoice
7. **✅ Test email sending** - Send a test invoice
8. **✅ Inform your team** - Let users know the system is ready

---

## 🔒 Security Notes

1. **Keep the backup file** on the server for at least 30 days
2. **Download a copy** of the backup to your local machine:
   ```bash
   # From your local machine
   scp username@your-server-ip:/path/to/dental-lab-mdr/backups/smilelab_backup_*.json ~/Desktop/
   ```
3. **Secure the backup** - Contains sensitive data!

---

## 📞 Common Issues

### Issue: "DATABASE_URL points to localhost"
**Solution:** Update .env to point to production database server

### Issue: "Permission denied"
**Solution:** Run with sudo or check file permissions

### Issue: "Port 5432 connection refused"
**Solution:** Make sure PostgreSQL is running on the server

### Issue: "Out of disk space"
**Solution:** Clean up old backups or increase server storage

---

**Last Updated:** 2025-02-08
