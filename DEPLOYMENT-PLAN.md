# Smilelab MDR - Production Deployment Plan

## Infrastructure Overview

### Stack Architecture
```
Cloudflare CDN (Global Edge Network)
            ↓
Digital Ocean Droplet (Amsterdam - EU GDPR Compliance)
├── Nginx (Reverse Proxy + SSL)
├── Next.js App (Docker Container)
├── PostgreSQL 15 (Docker Container)
└── Digital Ocean Spaces (Backups + File Storage)
```

---

## Phase 1: Digital Ocean Setup

### 1.1 Create Droplet

**Specifications**:
- **Region**: Amsterdam (AMS3) - EU GDPR compliant
- **Size**: Basic Droplet - 4GB RAM / 2 vCPU / 80GB SSD ($24/month)
- **OS**: Ubuntu 22.04 LTS x64
- **Hostname**: smilelab-mdr-prod

**Initial Setup**:
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx ufw git
```

### 1.2 Configure Firewall (UFW)

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow PostgreSQL (only from localhost)
ufw allow from 127.0.0.1 to any port 5432

# Enable firewall
ufw enable
```

### 1.3 Create Deployment User

```bash
# Create non-root user
adduser smilelab
usermod -aG sudo smilelab
usermod -aG docker smilelab

# Switch to deployment user
su - smilelab
```

---

## Phase 2: Digital Ocean Spaces Setup

### 2.1 Create Space

**Settings**:
- **Name**: smilelab-mdr-backups
- **Region**: Amsterdam (AMS3)
- **CDN**: Enabled
- **Access**: Private (use Access Keys)

### 2.2 Generate Access Keys

1. Go to API → Spaces Keys
2. Generate new key pair
3. Save credentials:
   - **Spaces Access Key**: `DO_SPACES_KEY`
   - **Spaces Secret Key**: `DO_SPACES_SECRET`

### 2.3 Install s3cmd for Backups

```bash
# Install s3cmd
sudo apt install -y s3cmd

# Configure s3cmd
s3cmd --configure
# Enter Spaces credentials when prompted
# Host: ams3.digitaloceanspaces.com
```

---

## Phase 3: Application Containerization

### 3.1 Create Production Dockerfile

Create `/home/smilelab/app/Dockerfile`:

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 3.2 Update next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['smilelab-mdr-backups.ams3.digitaloceanspaces.com'],
  },
};

module.exports = nextConfig;
```

### 3.3 Create Production docker-compose.yml

Create `/home/smilelab/app/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: smilelab-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - smilelab-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: smilelab-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - smilelab-network

volumes:
  postgres_data:
    driver: local

networks:
  smilelab-network:
    driver: bridge
```

### 3.4 Create Production .env File

Create `/home/smilelab/app/.env.production`:

```bash
# Database
POSTGRES_USER=smilelab_user
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=smilelab_mdr
DATABASE_URL="postgresql://smilelab_user:<PASSWORD>@postgres:5432/smilelab_mdr"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<GENERATE_WITH: openssl rand -base64 32>"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV=production

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Digital Ocean Spaces
DO_SPACES_KEY="<YOUR_SPACES_KEY>"
DO_SPACES_SECRET="<YOUR_SPACES_SECRET>"
DO_SPACES_ENDPOINT="https://ams3.digitaloceanspaces.com"
DO_SPACES_BUCKET="smilelab-mdr-backups"
```

---

## Phase 4: Nginx Configuration

### 4.1 Create Nginx Config

Create `/etc/nginx/sites-available/smilelab-mdr`:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=smilelab_limit:10m rate=10r/s;

# Upstream Next.js app
upstream nextjs_app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=smilelab_limit burst=20 nodelay;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy settings
    location / {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://nextjs_app;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Uploaded files (if stored locally)
    location /uploads {
        alias /home/smilelab/app/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://nextjs_app;
        access_log off;
    }
}
```

### 4.2 Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/smilelab-mdr /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Phase 5: Cloudflare CDN Setup

### 5.1 Add Domain to Cloudflare

1. Go to Cloudflare Dashboard
2. Add site: `yourdomain.com`
3. Choose Free plan
4. Copy nameservers

### 5.2 Update Domain Nameservers

Update your domain registrar with Cloudflare nameservers:
- `nameserver1.cloudflare.com`
- `nameserver2.cloudflare.com`

### 5.3 Configure DNS Records

**A Record**:
```
Type: A
Name: @
IPv4: <YOUR_DROPLET_IP>
Proxy: Enabled (Orange Cloud)
```

**A Record (www)**:
```
Type: A
Name: www
IPv4: <YOUR_DROPLET_IP>
Proxy: Enabled (Orange Cloud)
```

**CNAME Record (Spaces CDN)**:
```
Type: CNAME
Name: cdn
Target: smilelab-mdr-backups.ams3.cdn.digitaloceanspaces.com
Proxy: Enabled
```

### 5.4 Cloudflare SSL/TLS Settings

1. Go to SSL/TLS → Overview
2. Set mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**
5. Enable **Minimum TLS Version: 1.2**

### 5.5 Cloudflare Speed Optimization

**Auto Minify**:
- ✅ JavaScript
- ✅ CSS
- ✅ HTML

**Brotli Compression**: ✅ Enabled

**Rocket Loader**: ❌ Disabled (can break Next.js hydration)

**Caching**:
- Browser Cache TTL: 4 hours
- Cache Level: Standard
- Create Page Rule for `/_next/static/*`:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month

### 5.6 Cloudflare Security

**Firewall Rules**:
```
Rule 1: Block Bad Bots
- Field: Threat Score
- Operator: Greater than
- Value: 10
- Action: Block

Rule 2: Rate Limiting for Login
- Field: URI Path
- Operator: Equals
- Value: /api/auth/signin
- Action: Rate limit (10 requests per minute)
```

**Page Rules**:
```
Rule 1: Cache Static Assets
- URL: *yourdomain.com/_next/static/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
```

---

## Phase 6: SSL Certificate Setup

### Option A: Cloudflare Origin Certificate (Recommended)

1. Go to Cloudflare SSL/TLS → Origin Server
2. Create Certificate
3. Save certificate and private key on server:

```bash
sudo mkdir -p /etc/cloudflare
sudo nano /etc/cloudflare/origin-cert.pem  # Paste certificate
sudo nano /etc/cloudflare/origin-key.pem   # Paste private key
sudo chmod 600 /etc/cloudflare/*
```

4. Update Nginx SSL paths:
```nginx
ssl_certificate /etc/cloudflare/origin-cert.pem;
ssl_certificate_key /etc/cloudflare/origin-key.pem;
```

### Option B: Let's Encrypt (Alternative)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (with Cloudflare proxy DISABLED temporarily)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## Phase 7: Database Backup Strategy

### 7.1 Create Backup Script

Create `/home/smilelab/scripts/backup-db.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/smilelab/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="smilelab_mdr"
DB_USER="smilelab_user"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
docker exec smilelab-postgres pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/smilelab_mdr_$TIMESTAMP.sql.gz"

# Upload to Digital Ocean Spaces
s3cmd put "$BACKUP_DIR/smilelab_mdr_$TIMESTAMP.sql.gz" s3://smilelab-mdr-backups/database/

# Delete local backups older than retention period
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Delete old backups from Spaces (keep last 60 days)
s3cmd ls s3://smilelab-mdr-backups/database/ | \
  while read -r line; do
    createDate=$(echo $line | awk {'print $1" "$2'})
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "60 days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
      fileName=$(echo $line | awk {'print $4'})
      s3cmd del "$fileName"
    fi
  done

echo "Backup completed: smilelab_mdr_$TIMESTAMP.sql.gz"
```

### 7.2 Make Script Executable

```bash
chmod +x /home/smilelab/scripts/backup-db.sh
```

### 7.3 Schedule Automated Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/smilelab/scripts/backup-db.sh >> /home/smilelab/logs/backup.log 2>&1
```

---

## Phase 8: Deployment Process

### 8.1 Initial Deployment

```bash
# Clone repository
cd /home/smilelab
git clone <YOUR_REPO_URL> app
cd app

# Copy environment file
cp .env.production .env

# Build and start containers
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker exec smilelab-app npx prisma migrate deploy

# Seed initial data (if needed)
docker exec smilelab-app npx prisma db seed
```

### 8.2 Update Deployment Script

Create `/home/smilelab/scripts/deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to app directory
cd /home/smilelab/app

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Backup database before deployment
echo "💾 Creating pre-deployment backup..."
/home/smilelab/scripts/backup-db.sh

# Rebuild and restart containers
echo "🐳 Rebuilding containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🔄 Restarting services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
echo "📊 Running database migrations..."
docker exec smilelab-app npx prisma migrate deploy

# Health check
echo "🏥 Checking application health..."
sleep 10
curl -f http://localhost:3000/health || echo "⚠️  Health check failed!"

echo "✅ Deployment completed!"
```

### 8.3 Make Deployment Script Executable

```bash
chmod +x /home/smilelab/scripts/deploy.sh
```

---

## Phase 9: Monitoring & Maintenance

### 9.1 Log Management

```bash
# View application logs
docker logs -f smilelab-app

# View PostgreSQL logs
docker logs -f smilelab-postgres

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 9.2 Health Monitoring Script

Create `/home/smilelab/scripts/health-check.sh`:

```bash
#!/bin/bash

# Check if app container is running
if ! docker ps | grep -q smilelab-app; then
    echo "⚠️  App container is down! Restarting..."
    docker-compose -f /home/smilelab/app/docker-compose.prod.yml up -d app
fi

# Check if database container is running
if ! docker ps | grep -q smilelab-postgres; then
    echo "⚠️  Database container is down! Restarting..."
    docker-compose -f /home/smilelab/app/docker-compose.prod.yml up -d postgres
fi

# Check HTTP health endpoint
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  Health check failed! Restarting app..."
    docker restart smilelab-app
fi
```

### 9.3 Schedule Health Checks

```bash
crontab -e

# Add health check every 5 minutes
*/5 * * * * /home/smilelab/scripts/health-check.sh >> /home/smilelab/logs/health.log 2>&1
```

---

## Phase 10: Security Hardening

### 10.1 SSH Security

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Disable root login
PermitRootLogin no

# Disable password authentication (use SSH keys only)
PasswordAuthentication no

# Restart SSH
sudo systemctl restart sshd
```

### 10.2 Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create Nginx jail
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https"]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
```

```bash
# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 10.3 Docker Security

```bash
# Run containers with limited resources
docker update --memory="1g" --cpus="1.0" smilelab-app
docker update --memory="2g" --cpus="1.5" smilelab-postgres
```

---

## Cost Breakdown (Monthly)

| Service | Specification | Cost |
|---------|--------------|------|
| Digital Ocean Droplet | 4GB RAM / 2 vCPU | $24 |
| Digital Ocean Spaces | 250GB + CDN | $5 |
| Cloudflare | Free Plan | $0 |
| Domain (yearly/12) | .com domain | ~$1 |
| **Total** | | **~$30/month** |

---

## Deployment Checklist

### Pre-Deployment

- [ ] Digital Ocean Droplet created (Amsterdam)
- [ ] Digital Ocean Spaces created
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Docker installed
- [ ] Nginx configured

### Deployment

- [ ] Repository cloned
- [ ] Docker containers built
- [ ] Database migrations run
- [ ] Initial seed data loaded
- [ ] Nginx restarted
- [ ] SSL verified (https:// working)
- [ ] Cloudflare CDN active

### Post-Deployment

- [ ] Backup script configured
- [ ] Cron jobs scheduled
- [ ] Health monitoring active
- [ ] Logs accessible
- [ ] Firewall rules tested
- [ ] Test PDF generation
- [ ] Test email sending
- [ ] Test file uploads

---

## Rollback Procedure

If deployment fails:

```bash
# Stop new containers
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
gunzip -c /home/smilelab/backups/smilelab_mdr_TIMESTAMP.sql.gz | \
  docker exec -i smilelab-postgres psql -U smilelab_user -d smilelab_mdr

# Revert to previous commit
git checkout <PREVIOUS_COMMIT_HASH>

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations for reverted version
docker exec smilelab-app npx prisma migrate deploy
```

---

## Support & Troubleshooting

### Common Issues

**Issue 1: App won't start**
```bash
# Check logs
docker logs smilelab-app

# Check environment variables
docker exec smilelab-app env | grep DATABASE_URL
```

**Issue 2: Database connection failed**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec smilelab-postgres psql -U smilelab_user -d smilelab_mdr -c "SELECT 1;"
```

**Issue 3: PDF generation fails**
```bash
# Ensure Puppeteer dependencies are in Dockerfile
# Add to Dockerfile if missing:
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Issue 4: High memory usage**
```bash
# Check container stats
docker stats

# Adjust memory limits
docker update --memory="2g" smilelab-app
```

---

## Next Steps

1. **Set up staging environment** (optional) - Clone to separate droplet for testing
2. **Configure monitoring** - Uptime Robot, New Relic, or similar
3. **Set up error tracking** - Sentry integration
4. **Configure analytics** - Google Analytics or privacy-focused alternative
5. **Document API** - OpenAPI/Swagger documentation
6. **Load testing** - Test with expected user load

---

**Deployment Status**: Ready for production 🚀
**Estimated Setup Time**: 4-6 hours
**Maintenance**: ~1 hour/month

---

*Last Updated: January 2026*
