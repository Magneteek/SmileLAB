# Smilelab MDR - Backup & Disaster Recovery Setup Guide

Complete guide for setting up automated database backups with Digital Ocean Spaces.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create Digital Ocean Spaces Bucket](#step-1-create-digital-ocean-spaces-bucket)
4. [Step 2: Configure s3cmd (Localhost)](#step-2-configure-s3cmd-localhost)
5. [Step 3: Test Localhost Backups](#step-3-test-localhost-backups)
6. [Step 4: Production Deployment](#step-4-production-deployment)
7. [Step 5: Schedule Automated Backups](#step-5-schedule-automated-backups)
8. [Restoration Guide](#restoration-guide)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Backup Strategy: 3-2-1 Rule

```
3 = Three copies of data
2 = Two different storage types
1 = One copy off-site

For Smilelab MDR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Live Database (PostgreSQL)
2. Local Backups (7 days retention)
3. Off-Site Backups (Digital Ocean Spaces, 90 days retention)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Files Included

- **`scripts/backup-smilelab-local.sh`** - Localhost backup script (for testing)
- **`scripts/backup-smilelab-production.sh`** - Production backup script (for droplet)
- **`scripts/restore-from-backup.sh`** - Database restoration script
- **`BACKUP-SETUP-GUIDE.md`** - This guide

---

## Prerequisites

### On Localhost (Mac)

- ✅ PostgreSQL running (already have this)
- ✅ Smilelab MDR database created
- ⬜ `s3cmd` installed (we'll install this)
- ⬜ Digital Ocean Spaces bucket (we'll create this)

### On Production (Digital Ocean Droplet)

- ⬜ Ubuntu 22.04 LTS or similar
- ⬜ PostgreSQL installed
- ⬜ Smilelab MDR database deployed
- ⬜ `s3cmd` installed
- ⬜ Cron jobs configured

---

## Step 1: Create Digital Ocean Spaces Bucket

**📅 Do this: January 1st, 2025 (as you mentioned)**

### 1.1 Log into Digital Ocean

1. Go to https://cloud.digitalocean.com/
2. Log in with your account

### 1.2 Create Spaces Bucket

1. Click **"Spaces Object Storage"** in the left sidebar
2. Click **"Create Space"** button
3. Configure the Space:

   | Setting | Value | Why |
   |---------|-------|-----|
   | **Choose a datacenter region** | Amsterdam (AMS3) | Closest to Slovenia, GDPR compliant |
   | **Enable CDN** | ❌ No | Not needed for backups |
   | **Choose a unique name** | `smilelab-backups` | Must be globally unique, lowercase |
   | **Select a project** | Your project | For organization |
   | **Restrict File Listing** | ✅ Yes | Security - prevent public browsing |

4. Click **"Create Space"**

**✅ Your Spaces bucket is now created!**

URL will be: `https://smilelab-backups.ams3.digitaloceanspaces.com`

### 1.3 Generate Access Keys

1. Click **"API"** in the left sidebar
2. Scroll down to **"Spaces access keys"**
3. Click **"Generate New Key"**
4. Configure the key:
   - **Name**: `smilelab-backups-key`
   - Click **"Generate Key"**

5. **⚠️ IMPORTANT**: Save these credentials immediately!

   ```
   Access Key: XXXXXXXXXXXXXXXXXXXXXX
   Secret Key: YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   ```

   **You can only see the Secret Key ONCE!** Save it to your password manager now.

### 1.4 Update Backup Scripts

**Edit both backup scripts and replace these lines:**

**File: `scripts/backup-smilelab-local.sh`**
```bash
# Line 35-36: Replace with your bucket name
SPACES_BUCKET="s3://smilelab-backups"  # ✅ Use your actual bucket name
SPACES_REGION="ams3"  # ✅ Amsterdam region
```

**File: `scripts/backup-smilelab-production.sh`**
```bash
# Line 35-36: Replace with your bucket name
SPACES_BUCKET="s3://smilelab-backups"  # ✅ Use your actual bucket name
SPACES_REGION="ams3"  # ✅ Amsterdam region
```

---

## Step 2: Configure s3cmd (Localhost)

### 2.1 Install s3cmd on Mac

```bash
# Install with Homebrew
brew install s3cmd
```

### 2.2 Configure s3cmd

```bash
# Run configuration wizard
s3cmd --configure
```

**Answer the prompts as follows:**

```
Access Key: <paste your Spaces access key from Step 1.3>
Secret Key: <paste your Spaces secret key from Step 1.3>
Default Region [US]: ams3
S3 Endpoint [s3.amazonaws.com]: ams3.digitaloceanspaces.com
DNS-style bucket+hostname:port template: %(bucket)s.ams3.digitaloceanspaces.com
Encryption password: <press Enter to skip>
Path to GPG program [/usr/local/bin/gpg]: <press Enter>
Use HTTPS protocol [Yes]: Yes
HTTP Proxy server name: <press Enter>

Test access with supplied credentials? [Y/n] Y
```

**Expected output:**
```
Success. Your access key and secret key worked fine :-)
```

```
Save settings? [y/N] y
Configuration saved to '/Users/yourusername/.s3cfg'
```

**✅ s3cmd is now configured!**

### 2.3 Verify Spaces Access

```bash
# List your bucket (should be empty)
s3cmd ls s3://smilelab-backups/

# Expected output: (empty list or error if bucket name is wrong)
```

---

## Step 3: Test Localhost Backups

### 3.1 Make Scripts Executable

```bash
cd /Users/kris/CLAUDEtools/ORCHESTRAI/projects/smilelab-ec615192-0f63-48d1-96d5-44834d460e3d/deliverables/development/dental-lab-mdr

chmod +x scripts/backup-smilelab-local.sh
chmod +x scripts/restore-from-backup.sh
```

### 3.2 Run First Backup

```bash
# Run the backup script
./scripts/backup-smilelab-local.sh
```

**Expected output:**
```
[INFO] =========================================
[INFO] Smilelab MDR Backup Script (Localhost)
[INFO] =========================================
[INFO] Started at: Wed Jan  1 10:00:00 CET 2025

[INFO] Checking prerequisites...
[INFO] Prerequisites check passed!
[INFO] Creating database backup...
[INFO] Database: smilelab_mdr
[INFO] Output: /Users/kris/smilelab-backups/smilelab_backup_20250101_100000.sql.gz
[INFO] Backup created successfully! Size: 2.3M
[INFO] Uploading backup to Digital Ocean Spaces...
[INFO] Upload to Spaces successful!
[INFO] Cleaning up local backups older than 7 days...
[INFO] Local backups remaining: 1
[INFO] =========================================
[INFO] Backup Summary
[INFO] =========================================
[INFO] Backup file: smilelab_backup_20250101_100000.sql.gz
[INFO] Local path: /Users/kris/smilelab-backups/smilelab_backup_20250101_100000.sql.gz
[INFO] Spaces path: s3://smilelab-backups/daily/smilelab_backup_20250101_100000.sql.gz
[INFO] Retention: 7 days (local), 90 days (Spaces)
[INFO] =========================================

[INFO] Backup completed successfully at: Wed Jan  1 10:00:05 CET 2025
```

### 3.3 Verify Backup in Spaces

```bash
# List backups in Spaces
s3cmd ls s3://smilelab-backups/daily/
```

**Expected output:**
```
2025-01-01 10:00   2400000  s3://smilelab-backups/daily/smilelab_backup_20250101_100000.sql.gz
```

**✅ Your first backup is in the cloud!**

### 3.4 Test Restoration (Optional but Recommended)

**⚠️ WARNING: This will replace your local database! Only do this if you have test data.**

```bash
# Restore from Spaces backup
./scripts/restore-from-backup.sh s3://smilelab-backups/daily/smilelab_backup_20250101_100000.sql.gz
```

Follow the prompts and type `YES` to confirm.

**If restoration succeeds, your backup system is working perfectly!**

---

## Step 4: Production Deployment

**Do this when you deploy to Digital Ocean droplet**

### 4.1 Copy Scripts to Droplet

```bash
# From your laptop, copy scripts to droplet
scp scripts/backup-smilelab-production.sh root@YOUR_DROPLET_IP:/usr/local/bin/
scp scripts/restore-from-backup.sh root@YOUR_DROPLET_IP:/usr/local/bin/

# SSH into droplet
ssh root@YOUR_DROPLET_IP
```

### 4.2 Make Scripts Executable

```bash
chmod +x /usr/local/bin/backup-smilelab-production.sh
chmod +x /usr/local/bin/restore-from-backup.sh
```

### 4.3 Install s3cmd on Droplet

```bash
# Update package list
apt update

# Install s3cmd
apt install -y s3cmd
```

### 4.4 Configure s3cmd on Droplet

```bash
# Run configuration wizard
s3cmd --configure
```

**Use the SAME settings as Step 2.2:**
- Access Key: (your Spaces access key)
- Secret Key: (your Spaces secret key)
- Region: `ams3`
- Endpoint: `ams3.digitaloceanspaces.com`
- etc.

### 4.5 Test Production Backup

```bash
# Run backup manually
/usr/local/bin/backup-smilelab-production.sh
```

**Check the log:**
```bash
tail -f /var/log/smilelab-backup.log
```

**Verify in Spaces:**
```bash
s3cmd ls s3://smilelab-backups/daily/
```

---

## Step 5: Schedule Automated Backups

### 5.1 Configure Cron Job

```bash
# Edit root crontab
crontab -e
```

**Add this line (runs daily at 2 AM):**
```cron
0 2 * * * /usr/local/bin/backup-smilelab-production.sh
```

**Save and exit** (`:wq` in vim, or `Ctrl+X` then `Y` in nano)

### 5.2 Verify Cron Job

```bash
# List current cron jobs
crontab -l
```

**Expected output:**
```
0 2 * * * /usr/local/bin/backup-smilelab-production.sh
```

### 5.3 Test Cron Execution (Optional)

**Temporarily change cron to run in 2 minutes:**
```bash
# If current time is 14:23, set cron to run at 14:25
25 14 * * * /usr/local/bin/backup-smilelab-production.sh
```

Wait 2 minutes, then check:
```bash
tail /var/log/smilelab-backup.log
```

**If you see a new backup entry, cron is working!**

**Don't forget to change it back to 2 AM:**
```bash
crontab -e
# Change to: 0 2 * * * /usr/local/bin/backup-smilelab-production.sh
```

---

## Restoration Guide

### Scenario 1: Restore from Local Backup (Fast Recovery)

**Use this if you need to quickly restore from a recent backup (last 7 days).**

```bash
# List available local backups
ls -lh /var/backups/postgresql/smilelab/

# Restore from specific backup
/usr/local/bin/restore-from-backup.sh /var/backups/postgresql/smilelab/smilelab_backup_20250105_020000.sql.gz
```

**Recovery time: 2-5 minutes**

### Scenario 2: Restore from Spaces (Disaster Recovery)

**Use this if your droplet was destroyed or local backups are corrupted.**

```bash
# List available Spaces backups
s3cmd ls s3://smilelab-backups/daily/

# Restore from specific Spaces backup
/usr/local/bin/restore-from-backup.sh s3://smilelab-backups/daily/smilelab_backup_20250105_020000.sql.gz
```

**Recovery time: 10-30 minutes** (includes download time)

### Scenario 3: Point-in-Time Recovery

**Restore to a specific date:**

```bash
# Find backup closest to desired date
s3cmd ls s3://smilelab-backups/daily/ | grep "20250115"

# Restore that backup
/usr/local/bin/restore-from-backup.sh s3://smilelab-backups/daily/smilelab_backup_20250115_020000.sql.gz
```

### After Restoration

**Always restart your application:**

```bash
# If using PM2
pm2 restart smilelab-mdr

# If using systemd
systemctl restart smilelab-mdr

# If using npm directly
pkill -f "npm run start"
npm run start &
```

---

## Monitoring & Maintenance

### Daily Monitoring

**Check backup logs daily:**
```bash
# View last 50 lines of backup log
tail -50 /var/log/smilelab-backup.log

# Check for errors
grep ERROR /var/log/smilelab-backup.log
```

### Weekly Checks

**Verify Spaces backups:**
```bash
# Count backups in Spaces (should have ~7 backups after 1 week)
s3cmd ls s3://smilelab-backups/daily/ | wc -l

# Check total storage used
s3cmd du s3://smilelab-backups/
```

### Monthly Tasks

**Test restoration process:**
1. Set up a test droplet or local environment
2. Restore a backup from Spaces
3. Verify data integrity
4. Document results

### Cost Monitoring

**Check Spaces usage in DO dashboard:**
- Spaces → Usage → View billing details
- Expected cost: ~$5/month for 45GB of backups

---

## Troubleshooting

### Problem: "pg_dump: command not found"

**Solution:**
```bash
# Find PostgreSQL bin directory
which psql

# Add to PATH (if needed)
export PATH=$PATH:/usr/lib/postgresql/15/bin
```

### Problem: "s3cmd: AccessDenied"

**Solution:**
```bash
# Reconfigure s3cmd with correct credentials
s3cmd --configure

# Verify credentials
s3cmd ls s3://smilelab-backups/
```

### Problem: Backup script fails silently

**Solution:**
```bash
# Run script manually to see errors
/usr/local/bin/backup-smilelab-production.sh

# Check permissions
ls -l /usr/local/bin/backup-smilelab-production.sh

# Should be executable: -rwxr-xr-x
chmod +x /usr/local/bin/backup-smilelab-production.sh
```

### Problem: Cron job doesn't run

**Solution:**
```bash
# Check cron logs
tail -f /var/log/syslog | grep CRON

# Verify cron service is running
systemctl status cron

# Restart cron if needed
systemctl restart cron
```

### Problem: "Disk full" error

**Solution:**
```bash
# Check disk usage
df -h

# Clean up old local backups manually
find /var/backups/postgresql/smilelab -name "*.sql.gz" -mtime +7 -delete

# Reduce local retention period in backup script
# Edit line 24: RETENTION_DAYS=3  # Instead of 7
```

---

## Cost Summary

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| **Digital Ocean Spaces** | $5 | 250GB storage + 1TB transfer |
| **Bandwidth** | $0 | Included in Spaces plan |
| **Total** | **$5/month** | ~45GB used (18% of quota) |

**Annual cost: $60**

**Value: Priceless** (imagine losing all your patient data, invoices, and orders!)

---

## Security Best Practices

### 1. Protect Access Keys

```bash
# Never commit .s3cfg to git
echo ".s3cfg" >> .gitignore

# Restrict file permissions
chmod 600 ~/.s3cfg
```

### 2. Encrypt Backups (Optional)

**For extra security, encrypt backups before uploading:**

```bash
# Install GPG
apt install gnupg

# Generate encryption key
gpg --full-generate-key

# Modify backup script to encrypt:
pg_dump $DB_NAME | gzip | gpg --encrypt --recipient admin@dentro.si > backup.sql.gz.gpg
```

### 3. Test Restorations Regularly

**Schedule quarterly restoration tests:**
- Q1: Test local backup restoration
- Q2: Test Spaces backup restoration
- Q3: Test cross-region restoration
- Q4: Full disaster recovery drill

---

## Next Steps

### Immediate (January 1st, 2025)

- [ ] Create Digital Ocean Spaces bucket
- [ ] Generate Spaces access keys
- [ ] Update backup scripts with bucket name
- [ ] Configure s3cmd on localhost
- [ ] Run first test backup
- [ ] Verify backup appears in Spaces

### Before Production Launch

- [ ] Deploy app to Digital Ocean droplet
- [ ] Copy production backup script to droplet
- [ ] Configure s3cmd on droplet
- [ ] Test production backup manually
- [ ] Schedule cron job
- [ ] Test restoration process

### After Launch

- [ ] Monitor backup logs daily (first week)
- [ ] Verify weekly backup counts
- [ ] Perform first test restoration (month 1)
- [ ] Document any issues or improvements
- [ ] Set calendar reminders for quarterly tests

---

## Support

If you encounter any issues:

1. Check this guide's troubleshooting section
2. Review backup logs: `/var/log/smilelab-backup.log`
3. Test s3cmd access: `s3cmd ls s3://smilelab-backups/`
4. Verify PostgreSQL is running: `pg_isready`

---

**✅ You now have enterprise-grade database backups for your dental lab management system!**

**Happy New Year! 🎉 Set up your backups on January 1st, 2025!**
