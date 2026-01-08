# Smilelab MDR Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup

Create a `.env.production` file on your server with these variables:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/smilelab_mdr"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key-here-min-32-chars"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Optional: Puppeteer
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

### 2. Server Requirements

- **Node.js**: v20+ (LTS)
- **PostgreSQL**: 15+
- **RAM**: Minimum 4GB
- **Storage**: 20GB+ (for documents)
- **Chromium**: For PDF generation

## Deployment Steps

### Option A: Fresh Installation on Server

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd dental-lab-mdr

# 2. Switch to main branch
git checkout main
git pull origin main

# 3. Install dependencies
npm install
# This will automatically run 'prisma generate' via postinstall script

# 4. Set up environment variables
cp .env.example .env.production
nano .env.production  # Edit with your production values

# 5. Run database migrations
npm run db:migrate

# 6. (Optional) Seed initial data
npm run db:seed

# 7. Build the application
npm run build

# 8. Start the production server
npm start
# Server will run on port 3210 by default
```

### Option B: Update Existing Deployment

```bash
# 1. Navigate to your deployment directory
cd /path/to/dental-lab-mdr

# 2. Stop the application
pm2 stop dental-lab-mdr  # If using PM2
# OR
systemctl stop dental-lab-mdr  # If using systemd

# 3. Pull latest changes
git fetch origin
git pull origin main

# 4. Install new dependencies (if any)
npm install
# This automatically runs 'prisma generate'

# 5. Run new migrations (if any)
npm run db:migrate

# 6. Rebuild the application
npm run build

# 7. Restart the application
pm2 restart dental-lab-mdr  # If using PM2
# OR
systemctl start dental-lab-mdr  # If using systemd
```

## Process Management (Recommended: PM2)

### Install PM2

```bash
npm install -g pm2
```

### Start Application with PM2

```bash
# Start the app
pm2 start npm --name "dental-lab-mdr" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on server boot
pm2 startup
```

### PM2 Common Commands

```bash
# View logs
pm2 logs dental-lab-mdr

# Monitor
pm2 monit

# Restart
pm2 restart dental-lab-mdr

# Stop
pm2 stop dental-lab-mdr

# Delete
pm2 delete dental-lab-mdr
```

## Nginx Configuration (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3210;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload size limit (for file uploads)
    client_max_body_size 50M;
}
```

### Enable Nginx Site

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Issue: Prisma Build Error

**Error**: "Cannot find module '@prisma/client'"

**Solution**:
```bash
# Ensure postinstall script runs
npm install
# Or manually generate
npx prisma generate
```

### Issue: Database Connection Error

**Error**: "Can't reach database server"

**Solution**:
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in .env.production
3. Check PostgreSQL accepts connections: `psql -U username -d smilelab_mdr`

### Issue: PDF Generation Fails

**Error**: "Could not find Chrome/Chromium"

**Solution**:
```bash
# Install Chromium
sudo apt update
sudo apt install chromium-browser

# Set path in .env.production
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
```

### Issue: Port Already in Use

**Error**: "Port 3210 is already in use"

**Solution**:
```bash
# Find process using port
sudo lsof -i :3210

# Kill process
kill -9 <PID>

# Or change port in package.json start script
```

## Post-Deployment Verification

### 1. Health Check

Visit: `https://your-domain.com/api/health` (if you have a health endpoint)

### 2. Test Complete Workflow

1. ✅ Login with admin account
2. ✅ Configure lab settings (Settings → Lab Configuration)
3. ✅ Create a dentist
4. ✅ Create an order (should be numbered 26001)
5. ✅ Create a worksheet (should be numbered DN-001)
6. ✅ Perform QC inspection
7. ✅ Generate Annex XIII PDF
8. ✅ Generate worksheet PDF
9. ✅ Create invoice
10. ✅ Send invoice via email

### 3. Check Logs

```bash
# PM2 logs
pm2 logs dental-lab-mdr

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /home/user/backup-db.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U username smilelab_mdr > $BACKUP_DIR/smilelab_mdr_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "smilelab_mdr_*.sql" -mtime +30 -delete
EOF

# Make executable
chmod +x /home/user/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/user/backup-db.sh
```

### Document Backup

```bash
# Backup documents folder
tar -czf documents_backup_$(date +%Y%m%d).tar.gz /path/to/dental-lab-mdr/documents
```

## Monitoring

### Setup Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Monitor documents folder
du -sh /path/to/dental-lab-mdr/documents
```

## Security Best Practices

1. ✅ Use strong NEXTAUTH_SECRET (min 32 random characters)
2. ✅ Enable firewall (ufw)
3. ✅ Keep Node.js and dependencies updated
4. ✅ Regular database backups
5. ✅ SSL/TLS enabled (HTTPS only)
6. ✅ Restrict PostgreSQL to localhost
7. ✅ Use environment variables (never commit secrets)
8. ✅ Regular security updates: `sudo apt update && sudo apt upgrade`

## Performance Optimization

### Enable Nginx Caching

```nginx
# Add to nginx server block
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Connection Pooling

Already configured in Prisma (default pool size: 10)

## Support

For issues or questions:
- Check logs: `pm2 logs dental-lab-mdr`
- Review this guide
- Check application documentation

---

**Last Updated**: 2026-01-08
**Version**: 1.0
