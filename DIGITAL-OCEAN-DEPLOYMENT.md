# Digital Ocean Deployment Guide - Step by Step

## 🎯 Deployment Overview

**What we're deploying:**
- Next.js 15 application (Smilelab MDR)
- PostgreSQL 15 database
- Node.js 20 runtime

**Estimated time:** 45-60 minutes
**Cost:** $24-31/month

---

## 📋 Prerequisites

Before starting, you need:
- [ ] Digital Ocean account
- [ ] Credit card for payment
- [ ] Domain name (optional, can use IP address initially)
- [ ] This codebase ready to deploy

---

## Step 1: Create Digital Ocean Droplet (5 minutes)

### 1.1 Login to Digital Ocean
Go to: https://cloud.digitalocean.com/

### 1.2 Create New Droplet
Click: **Create** → **Droplets**

### 1.3 Choose Configuration

**Choose an image:**
- Select: **Ubuntu 22.04 (LTS) x64**

**Choose Size:**
- Droplet Type: **Basic**
- CPU options: **Regular**
- Plan: **$24/month** (4 GB RAM / 2 CPUs / 80 GB SSD)
  - Or **$31/month** (4 GB RAM / 2 CPUs / 120 GB SSD) for more storage

**Choose a datacenter region:**
- Select closest to you: **Frankfurt** (for Europe)

**Authentication:**
- Choose: **SSH keys** (recommended) or **Password**
- If SSH: Click "New SSH Key" and follow instructions
- If Password: Set a strong root password

**Finalize Details:**
- Hostname: `smilelab-mdr` (or your choice)
- Tags: `production`
- Enable: **Monitoring** (free)

Click: **Create Droplet**

Wait 1-2 minutes for droplet to be created.

### 1.4 Note Your Droplet IP
Once created, note the **IP address** (e.g., 142.93.XXX.XXX)

---

## Step 2: Connect to Your Droplet (2 minutes)

### Option A: Using SSH (Mac/Linux)
```bash
ssh root@YOUR_DROPLET_IP
```

### Option B: Using PuTTY (Windows)
1. Download PuTTY: https://www.putty.org/
2. Enter IP address
3. Click Open
4. Login as `root`

### First Login
You'll see: `Welcome to Ubuntu 22.04 LTS`

---

## Step 3: Initial Server Setup (5 minutes)

### 3.1 Update System
```bash
apt update && apt upgrade -y
```

### 3.2 Install Node.js 20
```bash
# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### 3.3 Install PostgreSQL 15
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Verify installation
psql --version  # Should show PostgreSQL 15.x
```

### 3.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 3.5 Install Nginx (Web Server)
```bash
apt install -y nginx
```

---

## Step 4: Configure PostgreSQL (5 minutes)

### 4.1 Set PostgreSQL Password
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
ALTER USER postgres PASSWORD 'smilelab2025';

# Exit PostgreSQL
\q
```

### 4.2 Create Database
```bash
sudo -u postgres psql -c "CREATE DATABASE smilelab_mdr;"
```

### 4.3 Test Connection
```bash
PGPASSWORD=smilelab2025 psql -U postgres -h localhost -d smilelab_mdr -c "SELECT 1;"
```

Should show:
```
 ?column?
----------
        1
```

---

## Step 5: Upload Your Application (10 minutes)

### Option A: Using Git (Recommended)

#### 5.1 Create Application Directory
```bash
mkdir -p /var/www
cd /var/www
```

#### 5.2 Install Git
```bash
apt install -y git
```

#### 5.3 Clone Your Repository
```bash
# If using GitHub/GitLab:
git clone YOUR_REPOSITORY_URL smilelab-mdr
cd smilelab-mdr

# Or if you don't have a repo yet, skip to Option B
```

### Option B: Using SCP (File Transfer)

**From your local machine** (not on the server):

```bash
# Navigate to your project folder
cd /path/to/dental-lab-mdr

# Transfer files (Mac/Linux)
scp -r . root@YOUR_DROPLET_IP:/var/www/smilelab-mdr

# Or use FileZilla (Windows):
# 1. Download FileZilla: https://filezilla-project.org/
# 2. Connect: Host: YOUR_DROPLET_IP, Username: root, Port: 22
# 3. Upload entire project folder to /var/www/smilelab-mdr
```

---

## Step 6: Configure Application (10 minutes)

### 6.1 Navigate to App Directory
```bash
cd /var/www/smilelab-mdr
```

### 6.2 Create Environment File
```bash
nano .env.production
```

**Paste this content** (press Ctrl+Shift+V to paste):
```env
# Database
DATABASE_URL="postgresql://postgres:smilelab2025@localhost:5432/smilelab_mdr"

# NextAuth
NEXTAUTH_URL="http://YOUR_DROPLET_IP:3000"
NEXTAUTH_SECRET="CHANGE_THIS_TO_RANDOM_STRING"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="info@dentro.si"
SMTP_PASS="your-gmail-app-password"

# Node Environment
NODE_ENV="production"
```

**Replace:**
- `YOUR_DROPLET_IP` → Your actual droplet IP
- `CHANGE_THIS_TO_RANDOM_STRING` → Generate with: `openssl rand -base64 32`
- `your-gmail-app-password` → Your Gmail app-specific password

**Save:** Ctrl+X, then Y, then Enter

### 6.3 Generate NEXTAUTH_SECRET
```bash
# Generate random secret
openssl rand -base64 32

# Copy the output and update .env.production file
nano .env.production
# Replace CHANGE_THIS_TO_RANDOM_STRING with generated value
```

### 6.4 Install Dependencies
```bash
npm install
```

This will take 2-3 minutes.

---

## Step 7: Setup Database (5 minutes)

### 7.1 Run Database Migrations
```bash
npx prisma migrate deploy
```

### 7.2 Seed Database with Production Data
```bash
npx prisma db seed
```

You should see:
```
🔑 PRODUCTION Login Credentials:
   Admin:       info@dentro.si / DentroAdm1n2026
   Technician:  3d@dentro.si / Dentro3D
```

### 7.3 (Optional) Clean Test Data, Keep Products
```bash
# This removes test dentists, patients, orders
# but keeps your product catalog and user accounts
npx ts-node scripts/clean-database.ts
```

---

## Step 8: Build Application (5 minutes)

### 8.1 Build for Production
```bash
NODE_ENV=production npm run build
```

This takes 2-3 minutes. You'll see build output.

### 8.2 Verify Build Success
Look for: `✓ Compiled successfully`

---

## Step 9: Start Application with PM2 (3 minutes)

### 9.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

**Paste this:**
```javascript
module.exports = {
  apps: [{
    name: 'smilelab-mdr',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/smilelab-mdr',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/smilelab-mdr-error.log',
    out_file: '/var/log/smilelab-mdr-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Save:** Ctrl+X, Y, Enter

### 9.2 Start Application
```bash
pm2 start ecosystem.config.js
```

### 9.3 Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

Copy and run the command it shows (starts with `sudo env PATH=...`)

### 9.4 Check Application Status
```bash
pm2 status
```

Should show:
```
│ smilelab-mdr │ online │
```

### 9.5 View Logs
```bash
pm2 logs smilelab-mdr --lines 50
```

You should see: `ready - started server on 0.0.0.0:3000`

---

## Step 10: Configure Nginx (5 minutes)

### 10.1 Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/smilelab-mdr
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Replace:** `YOUR_DROPLET_IP` with your actual IP

**Save:** Ctrl+X, Y, Enter

### 10.2 Enable Site
```bash
ln -s /etc/nginx/sites-available/smilelab-mdr /etc/nginx/sites-enabled/
```

### 10.3 Remove Default Site
```bash
rm /etc/nginx/sites-enabled/default
```

### 10.4 Test Nginx Configuration
```bash
nginx -t
```

Should show: `syntax is ok` and `test is successful`

### 10.5 Restart Nginx
```bash
systemctl restart nginx
```

---

## Step 11: Configure Firewall (2 minutes)

```bash
# Allow SSH
ufw allow ssh

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (for future SSL)
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Step 12: Test Your Application (2 minutes)

### 12.1 Open Browser
Go to: `http://YOUR_DROPLET_IP`

You should see the login page!

### 12.2 Login
**Admin:**
- Email: `info@dentro.si`
- Password: `DentroAdm1n2026`

**Technician:**
- Email: `3d@dentro.si`
- Password: `Dentro3D`

### 12.3 Change Passwords
1. Go to Settings
2. Change your password immediately
3. Use a password manager

---

## 🎉 Deployment Complete!

Your application is now running at: `http://YOUR_DROPLET_IP`

---

## 📊 Managing Your Database

### Option 1: Prisma Studio (Recommended - Easy GUI)

**On your server:**
```bash
cd /var/www/smilelab-mdr

# Start Prisma Studio
npx prisma studio
```

**Access from your computer:**
1. Create SSH tunnel:
   ```bash
   ssh -L 5555:localhost:5555 root@YOUR_DROPLET_IP
   ```
2. Open browser: `http://localhost:5555`
3. You'll see a nice GUI to manage all your data!

**Features:**
- ✅ View all tables
- ✅ Add/edit/delete records
- ✅ Filter and search
- ✅ Export data
- ✅ No SQL knowledge needed

### Option 2: pgAdmin (Advanced GUI)

**Install on your local computer:**
1. Download: https://www.pgadmin.org/download/
2. Install pgAdmin

**Connect via SSH Tunnel:**
1. Create SSH tunnel:
   ```bash
   ssh -L 5432:localhost:5432 root@YOUR_DROPLET_IP
   ```
2. In pgAdmin, add server:
   - Host: `localhost`
   - Port: `5432`
   - Database: `smilelab_mdr`
   - Username: `postgres`
   - Password: `smilelab2025`

### Option 3: Command Line (For Quick Checks)

```bash
# Connect to PostgreSQL
PGPASSWORD=smilelab2025 psql -U postgres -d smilelab_mdr

# Common commands:
\dt              # List all tables
\d users         # Describe users table
SELECT * FROM users;  # View all users
SELECT * FROM products;  # View all products
\q               # Exit
```

### Useful Database Commands

**Backup Database:**
```bash
pg_dump -U postgres smilelab_mdr > backup_$(date +%Y%m%d).sql
```

**Restore Database:**
```bash
psql -U postgres smilelab_mdr < backup_20250106.sql
```

**Clean Database (Keep Products):**
```bash
cd /var/www/smilelab-mdr
npx ts-node scripts/clean-database.ts
```

---

## 🔧 Common PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs smilelab-mdr

# Restart app
pm2 restart smilelab-mdr

# Stop app
pm2 stop smilelab-mdr

# Start app
pm2 start smilelab-mdr

# Monitor resources
pm2 monit
```

---

## 🔄 Updating Your Application

When you make changes and want to deploy updates:

```bash
# 1. Connect to server
ssh root@YOUR_DROPLET_IP

# 2. Navigate to app
cd /var/www/smilelab-mdr

# 3. Pull latest code (if using Git)
git pull

# 4. Install any new dependencies
npm install

# 5. Run any new database migrations
npx prisma migrate deploy

# 6. Rebuild application
npm run build

# 7. Restart PM2
pm2 restart smilelab-mdr

# 8. Check logs
pm2 logs smilelab-mdr --lines 50
```

---

## 🌐 Adding a Custom Domain (Optional)

### Step 1: Point Domain to Droplet
In your domain registrar (GoDaddy, Namecheap, etc.):
1. Create **A Record**:
   - Name: `@` (or `lab` for subdomain)
   - Value: `YOUR_DROPLET_IP`
   - TTL: `3600`

2. Create **A Record** for www:
   - Name: `www`
   - Value: `YOUR_DROPLET_IP`
   - TTL: `3600`

Wait 5-60 minutes for DNS propagation.

### Step 2: Update Nginx Configuration
```bash
nano /etc/nginx/sites-available/smilelab-mdr
```

Change `server_name YOUR_DROPLET_IP;` to:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

### Step 3: Install SSL Certificate (Free with Let's Encrypt)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS: Yes
```

### Step 4: Update Environment Variable
```bash
nano /var/www/smilelab-mdr/.env.production
```

Change:
```env
NEXTAUTH_URL="https://yourdomain.com"
```

Restart:
```bash
pm2 restart smilelab-mdr
```

---

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs smilelab-mdr --lines 100

# Common issues:
# 1. Database connection - check DATABASE_URL in .env.production
# 2. Port already in use - check: lsof -i :3000
# 3. Build errors - rebuild: npm run build
```

### Can't Access Website
```bash
# Check Nginx status
systemctl status nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Database Connection Errors
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
PGPASSWORD=smilelab2025 psql -U postgres -d smilelab_mdr -c "SELECT 1;"

# Check DATABASE_URL in .env.production
cat /var/www/smilelab-mdr/.env.production | grep DATABASE_URL
```

### Out of Memory
```bash
# Check memory usage
free -h

# Check PM2 memory
pm2 monit

# If needed, reduce instances or upgrade droplet
```

---

## 📦 Backup Strategy

### Automated Daily Backups
```bash
# Create backup script
nano /root/backup-smilelab.sh
```

**Paste this:**
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U postgres smilelab_mdr | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www smilelab-mdr

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable:**
```bash
chmod +x /root/backup-smilelab.sh
```

**Add to crontab (runs daily at 2 AM):**
```bash
crontab -e
```

Add this line:
```
0 2 * * * /root/backup-smilelab.sh >> /var/log/backup.log 2>&1
```

---

## 📞 Support Checklist

Before asking for help, check:
- [ ] PM2 status: `pm2 status`
- [ ] Application logs: `pm2 logs smilelab-mdr`
- [ ] Nginx status: `systemctl status nginx`
- [ ] Nginx error log: `tail -f /var/log/nginx/error.log`
- [ ] Database connection: `PGPASSWORD=smilelab2025 psql -U postgres -d smilelab_mdr -c "SELECT 1;"`
- [ ] Disk space: `df -h`
- [ ] Memory: `free -h`

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible via browser
- [ ] Login works with production credentials
- [ ] Dashboard loads correctly
- [ ] Can create orders
- [ ] Can create worksheets
- [ ] Database accessible via Prisma Studio
- [ ] Passwords changed from defaults
- [ ] Email sending configured (SMTP)
- [ ] Backups configured
- [ ] Firewall enabled
- [ ] PM2 autostart enabled
- [ ] SSL certificate installed (if using domain)

---

**🎉 Congratulations! Your application is live!**

**Access**: `http://YOUR_DROPLET_IP`
**Database Management**: Use Prisma Studio (easiest)
**Monitoring**: `pm2 monit`

