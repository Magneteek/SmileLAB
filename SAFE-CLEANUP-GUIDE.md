# Safe Cleanup Guide - Smilelab MDR Deployment
## ⚠️ Preserving n8n Instance

This guide safely removes the Smilelab MDR deployment without affecting your running n8n instance.

---

## Step 1: Pre-Cleanup Checklist

**CRITICAL**: Before proceeding, confirm:

```bash
# SSH into your server
ssh user@your-droplet-ip

# Check what's running (IDENTIFY n8n containers)
docker ps

# List all containers (stopped and running)
docker ps -a

# List all volumes
docker volume ls

# List all networks
docker network ls
```

**Copy the output above and note:**
- n8n container name(s)
- n8n volume name(s)
- n8n network name(s)

---

## Step 2: Backup Current Smilelab Database (If Exists)

```bash
# Create backup directory
mkdir -p ~/smilelab-backups

# Check if Smilelab PostgreSQL container exists
if docker ps -a | grep -q smilelab-postgres; then
    echo "Backing up Smilelab database..."

    # Backup the database
    docker exec smilelab-postgres pg_dump -U smilelab_user smilelab_mdr > \
      ~/smilelab-backups/smilelab_mdr_backup_$(date +%Y%m%d_%H%M%S).sql

    echo "✅ Backup saved to ~/smilelab-backups/"
else
    echo "No Smilelab database container found - skipping backup"
fi
```

---

## Step 3: Stop Smilelab Containers ONLY

```bash
# Navigate to Smilelab app directory (if it exists)
cd /home/smilelab/app 2>/dev/null || cd ~/app 2>/dev/null || echo "App directory not found"

# If docker-compose.prod.yml exists, stop containers via compose
if [ -f docker-compose.prod.yml ]; then
    echo "Stopping Smilelab containers via docker-compose..."
    docker-compose -f docker-compose.prod.yml down
fi

# Stop Smilelab containers individually (backup method)
docker stop smilelab-app 2>/dev/null || echo "smilelab-app not running"
docker stop smilelab-postgres 2>/dev/null || echo "smilelab-postgres not running"

# Verify n8n is still running
echo ""
echo "Checking n8n status..."
docker ps | grep n8n || echo "⚠️  n8n not found or not running!"
```

---

## Step 4: Remove Smilelab Containers

```bash
# Remove Smilelab containers (NOT n8n!)
docker rm smilelab-app 2>/dev/null || echo "smilelab-app not found"
docker rm smilelab-postgres 2>/dev/null || echo "smilelab-postgres not found"

# Verify removal
echo ""
echo "Remaining containers:"
docker ps -a

# Confirm n8n is intact
echo ""
echo "Verifying n8n..."
docker ps | grep n8n && echo "✅ n8n is safe!" || echo "⚠️  n8n issue!"
```

---

## Step 5: Remove Smilelab Docker Images

```bash
# List all images
docker images

# Remove Smilelab-specific images (look for dental-lab-mdr or smilelab)
docker rmi $(docker images | grep dental-lab-mdr | awk '{print $3}') 2>/dev/null || echo "No Smilelab images found"

# Clean up unused images (SAFE - only removes unused)
docker image prune -f
```

---

## Step 6: Remove Smilelab Docker Volumes

**CRITICAL**: Be very careful here - DO NOT delete n8n volumes!

```bash
# List all volumes
docker volume ls

# Remove Smilelab volumes ONLY (check names carefully!)
# Common Smilelab volume names:
# - app_postgres_data
# - smilelab_postgres_data
# - dental-lab-mdr_postgres_data

# Example - ADJUST volume name to match your setup:
docker volume rm app_postgres_data 2>/dev/null || echo "Volume not found"

# DO NOT RUN THIS unless you know your n8n volume names:
# docker volume prune -f  # ⚠️  DANGEROUS - will remove ALL unused volumes
```

**Manual approach (SAFER)**:
```bash
# List volumes and manually identify Smilelab ones
docker volume ls

# Remove specific Smilelab volumes one by one:
# docker volume rm <volume_name>
```

---

## Step 7: Remove Smilelab Network

```bash
# List networks
docker network ls

# Remove Smilelab network (if it exists and is unused)
docker network rm smilelab-network 2>/dev/null || echo "Network not found or in use"

# Clean up unused networks (SAFE)
docker network prune -f
```

---

## Step 8: Remove Nginx Configuration

```bash
# Check if Smilelab Nginx config exists
if [ -f /etc/nginx/sites-enabled/smilelab-mdr ]; then
    echo "Removing Smilelab Nginx configuration..."

    # Remove symlink
    sudo rm /etc/nginx/sites-enabled/smilelab-mdr

    # Remove config file
    sudo rm /etc/nginx/sites-available/smilelab-mdr

    # Test Nginx configuration
    sudo nginx -t

    # Reload Nginx if test passes
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
    else
        echo "⚠️  Nginx config error - please check manually"
    fi
else
    echo "No Smilelab Nginx config found"
fi
```

---

## Step 9: Remove Application Files

```bash
# Check application directory location
# Common locations:
# - /home/smilelab/app
# - ~/app
# - /opt/smilelab-mdr

# Example - ADJUST path to your actual location:
if [ -d "/home/smilelab/app" ]; then
    echo "Removing /home/smilelab/app..."
    rm -rf /home/smilelab/app
fi

# Remove smilelab user if it exists (OPTIONAL)
# sudo userdel -r smilelab  # ⚠️  Only if user was created for Smilelab
```

---

## Step 10: Remove SSL Certificates (If Dedicated to Smilelab)

**⚠️  ONLY if using Cloudflare Origin Certificates OR dedicated Let's Encrypt certs**

```bash
# If using Cloudflare Origin Certificate for Smilelab
sudo rm -rf /etc/cloudflare 2>/dev/null || echo "No Cloudflare certs found"

# If using Let's Encrypt ONLY for Smilelab (not n8n)
# sudo certbot delete --cert-name yourdomain.com
# ⚠️  DO NOT run this if n8n uses the same domain/certificate!
```

---

## Step 11: Clean Up Cron Jobs

```bash
# Check crontab
crontab -l

# Edit crontab and remove Smilelab-related jobs:
# - Database backups (/home/smilelab/scripts/backup-db.sh)
# - Health checks (/home/smilelab/scripts/health-check.sh)

crontab -e
# Delete Smilelab-related lines, save and exit
```

---

## Step 12: Remove Scripts and Logs

```bash
# Remove Smilelab scripts
rm -rf /home/smilelab/scripts 2>/dev/null || echo "No scripts directory"

# Remove Smilelab logs
rm -rf /home/smilelab/logs 2>/dev/null || echo "No logs directory"

# Remove Smilelab backups (OPTIONAL - keep if you want historical data)
# rm -rf /home/smilelab/backups
# rm -rf ~/smilelab-backups
```

---

## Step 13: Verification Checklist

Run these commands to verify cleanup:

```bash
echo "=== Docker Containers ==="
docker ps -a

echo ""
echo "=== Docker Images ==="
docker images

echo ""
echo "=== Docker Volumes ==="
docker volume ls

echo ""
echo "=== Docker Networks ==="
docker network ls

echo ""
echo "=== Nginx Sites ==="
ls -la /etc/nginx/sites-enabled/

echo ""
echo "=== n8n Status ==="
docker ps | grep n8n

echo ""
echo "=== Disk Usage ==="
df -h
```

**Expected Results:**
- ✅ No smilelab-* containers
- ✅ No dental-lab-mdr images
- ✅ No smilelab volumes (unless intentionally kept)
- ✅ No smilelab-network
- ✅ No smilelab-mdr Nginx config
- ✅ n8n container STILL RUNNING

---

## Step 14: Final n8n Health Check

```bash
# Check n8n is accessible
curl -I http://localhost:5678 || echo "n8n not responding on localhost:5678"

# Check n8n container logs
docker logs --tail 20 $(docker ps | grep n8n | awk '{print $1}')

# If n8n is behind Nginx, test the domain
# curl -I https://your-n8n-domain.com
```

---

## Complete One-Line Cleanup Script

**⚠️  DANGEROUS - Only run if you understand each command!**

```bash
#!/bin/bash

echo "🧹 Starting Smilelab MDR cleanup..."
echo "⚠️  This will NOT affect n8n"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

# Backup database
echo "📦 Backing up database..."
mkdir -p ~/smilelab-backups
docker exec smilelab-postgres pg_dump -U smilelab_user smilelab_mdr > \
  ~/smilelab-backups/smilelab_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null

# Stop containers
echo "⏸️  Stopping Smilelab containers..."
cd /home/smilelab/app 2>/dev/null && docker-compose -f docker-compose.prod.yml down 2>/dev/null
docker stop smilelab-app smilelab-postgres 2>/dev/null

# Remove containers
echo "🗑️  Removing containers..."
docker rm smilelab-app smilelab-postgres 2>/dev/null

# Remove images
echo "🖼️  Removing images..."
docker rmi $(docker images | grep dental-lab-mdr | awk '{print $3}') 2>/dev/null

# Remove volumes (ADJUST volume name!)
echo "💾 Removing volumes..."
docker volume rm app_postgres_data 2>/dev/null

# Remove network
echo "🌐 Removing network..."
docker network rm smilelab-network 2>/dev/null

# Remove Nginx config
echo "⚙️  Removing Nginx config..."
sudo rm /etc/nginx/sites-enabled/smilelab-mdr 2>/dev/null
sudo rm /etc/nginx/sites-available/smilelab-mdr 2>/dev/null
sudo nginx -t && sudo systemctl reload nginx

# Remove app files
echo "📁 Removing application files..."
rm -rf /home/smilelab/app 2>/dev/null

# Clean up Docker
echo "🧼 Cleaning up Docker..."
docker system prune -f

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Verifying n8n..."
docker ps | grep n8n && echo "✅ n8n is safe and running!" || echo "⚠️  Please check n8n manually!"
```

---

## Rollback (If Something Goes Wrong)

If you accidentally affected n8n:

```bash
# Check what containers are stopped
docker ps -a

# Restart n8n container
docker start <n8n-container-name>

# If n8n needs to be recreated, check its docker-compose.yml or original setup
```

---

## After Cleanup - Fresh Deployment

Once cleanup is complete, follow the updated **DEPLOYMENT-GUIDE.md** for fresh installation with the fixed Prisma configuration.

---

## Quick Reference: Safe Commands vs Dangerous

### ✅ SAFE (Won't affect n8n)
```bash
docker stop smilelab-app
docker rm smilelab-app
docker rmi dental-lab-mdr-app
docker volume rm app_postgres_data  # If you're 100% sure it's Smilelab
docker network rm smilelab-network
```

### ⚠️  DANGEROUS (Can affect n8n)
```bash
docker stop $(docker ps -aq)  # Stops ALL containers including n8n
docker system prune -a  # Removes ALL unused images
docker volume prune  # Removes ALL unused volumes
docker network prune  # Could affect n8n network
sudo rm -rf /etc/nginx/sites-*  # Could delete n8n config
```

---

## Need Help?

Before running any command:
1. Check what's currently running: `docker ps`
2. Identify n8n containers clearly
3. Make backups
4. Test each step individually
5. Verify n8n after each major step

**Remember**: When in doubt, DON'T delete - ASK FIRST!

---

*Last Updated: 2026-01-08*
