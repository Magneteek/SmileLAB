#!/bin/bash

###############################################################################
# Smilelab MDR - Safe Cleanup Script
# Location: /var/www/smilelab-mdr
# IMPORTANT: This script preserves your n8n instance!
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║      Smilelab MDR - Safe Deployment Cleanup             ║${NC}"
echo -e "${YELLOW}║      (n8n instance will be preserved)                    ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Confirmation
echo -e "${YELLOW}This script will:${NC}"
echo "  1. Backup Smilelab database (if exists)"
echo "  2. Stop Smilelab Docker containers"
echo "  3. Remove Smilelab containers, images, and volumes"
echo "  4. Remove Nginx configuration"
echo "  5. Archive application files (not delete)"
echo ""
echo -e "${RED}Your n8n instance will NOT be affected!${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting cleanup process...${NC}"
echo ""

###############################################################################
# STEP 1: Verify n8n is running
###############################################################################
echo -e "${YELLOW}[1/10]${NC} Verifying n8n status..."
if docker ps | grep -q n8n; then
    echo -e "${GREEN}✓ n8n is running${NC}"
    N8N_RUNNING=1
else
    echo -e "${YELLOW}⚠ n8n not detected or not running${NC}"
    N8N_RUNNING=0
fi
echo ""

###############################################################################
# STEP 2: Create backup directory
###############################################################################
echo -e "${YELLOW}[2/10]${NC} Creating backup directory..."
BACKUP_DIR="$HOME/smilelab-cleanup-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory: $BACKUP_DIR${NC}"
echo ""

###############################################################################
# STEP 3: Backup Smilelab database
###############################################################################
echo -e "${YELLOW}[3/10]${NC} Backing up Smilelab database..."
if docker ps -a | grep -q smilelab-postgres; then
    echo "Database container found, creating backup..."
    docker exec smilelab-postgres pg_dump -U smilelab_user smilelab_mdr > \
      "$BACKUP_DIR/smilelab_mdr_backup.sql" 2>/dev/null && \
      echo -e "${GREEN}✓ Database backed up to: $BACKUP_DIR/smilelab_mdr_backup.sql${NC}" || \
      echo -e "${YELLOW}⚠ Database backup failed (container may not be running)${NC}"
else
    echo -e "${YELLOW}⚠ No Smilelab database container found - skipping backup${NC}"
fi
echo ""

###############################################################################
# STEP 4: Stop Smilelab containers
###############################################################################
echo -e "${YELLOW}[4/10]${NC} Stopping Smilelab containers..."

# Try docker-compose first
if [ -f /var/www/smilelab-mdr/docker-compose.prod.yml ]; then
    cd /var/www/smilelab-mdr
    docker-compose -f docker-compose.prod.yml down 2>/dev/null && \
      echo -e "${GREEN}✓ Stopped via docker-compose${NC}" || \
      echo -e "${YELLOW}⚠ docker-compose down failed${NC}"
fi

# Stop individual containers
docker stop smilelab-app 2>/dev/null && echo -e "${GREEN}✓ Stopped smilelab-app${NC}" || echo "  smilelab-app not running"
docker stop smilelab-postgres 2>/dev/null && echo -e "${GREEN}✓ Stopped smilelab-postgres${NC}" || echo "  smilelab-postgres not running"

# Verify n8n still running
if [ $N8N_RUNNING -eq 1 ]; then
    if docker ps | grep -q n8n; then
        echo -e "${GREEN}✓ n8n still running - SAFE!${NC}"
    else
        echo -e "${RED}✗ WARNING: n8n is no longer running!${NC}"
        echo -e "${RED}Stopping cleanup. Please check n8n manually.${NC}"
        exit 1
    fi
fi
echo ""

###############################################################################
# STEP 5: Remove Smilelab containers
###############################################################################
echo -e "${YELLOW}[5/10]${NC} Removing Smilelab containers..."
docker rm smilelab-app 2>/dev/null && echo -e "${GREEN}✓ Removed smilelab-app${NC}" || echo "  smilelab-app not found"
docker rm smilelab-postgres 2>/dev/null && echo -e "${GREEN}✓ Removed smilelab-postgres${NC}" || echo "  smilelab-postgres not found"
echo ""

###############################################################################
# STEP 6: Remove Smilelab Docker images
###############################################################################
echo -e "${YELLOW}[6/10]${NC} Removing Smilelab Docker images..."
SMILELAB_IMAGES=$(docker images | grep -E 'dental-lab-mdr|smilelab' | awk '{print $3}')
if [ -n "$SMILELAB_IMAGES" ]; then
    echo "$SMILELAB_IMAGES" | xargs docker rmi -f 2>/dev/null && \
      echo -e "${GREEN}✓ Removed Smilelab images${NC}" || \
      echo -e "${YELLOW}⚠ Some images could not be removed${NC}"
else
    echo "  No Smilelab images found"
fi
echo ""

###############################################################################
# STEP 7: Remove Smilelab Docker volumes
###############################################################################
echo -e "${YELLOW}[7/10]${NC} Identifying Smilelab volumes..."
echo "Current volumes:"
docker volume ls

echo ""
echo -e "${YELLOW}⚠ MANUAL STEP REQUIRED${NC}"
echo "Please identify Smilelab volume names from the list above."
echo "Common patterns: smilelab-mdr_*, smilelab_postgres_data, app_postgres_data"
echo ""
read -p "Enter volume name to remove (or press Enter to skip): " VOLUME_NAME

if [ -n "$VOLUME_NAME" ]; then
    docker volume rm "$VOLUME_NAME" 2>/dev/null && \
      echo -e "${GREEN}✓ Removed volume: $VOLUME_NAME${NC}" || \
      echo -e "${RED}✗ Failed to remove volume (may be in use)${NC}"
else
    echo "  Skipping volume removal"
fi
echo ""

###############################################################################
# STEP 8: Remove Smilelab network
###############################################################################
echo -e "${YELLOW}[8/10]${NC} Removing Smilelab network..."
docker network rm smilelab-network 2>/dev/null && \
  echo -e "${GREEN}✓ Removed smilelab-network${NC}" || \
  echo "  smilelab-network not found or in use"

docker network rm smilelab-mdr_smilelab-network 2>/dev/null && \
  echo -e "${GREEN}✓ Removed smilelab-mdr_smilelab-network${NC}" || \
  echo "  smilelab-mdr_smilelab-network not found"
echo ""

###############################################################################
# STEP 9: Remove Nginx configuration
###############################################################################
echo -e "${YELLOW}[9/10]${NC} Removing Nginx configuration..."

# Backup Nginx config first
if [ -f /etc/nginx/sites-available/smilelab-mdr ]; then
    sudo cp /etc/nginx/sites-available/smilelab-mdr "$BACKUP_DIR/smilelab-mdr.nginx.conf"
    echo -e "${GREEN}✓ Backed up Nginx config${NC}"
fi

# Remove Nginx config
sudo rm -f /etc/nginx/sites-enabled/smilelab-mdr 2>/dev/null && \
  echo -e "${GREEN}✓ Removed /etc/nginx/sites-enabled/smilelab-mdr${NC}" || \
  echo "  File not found"

sudo rm -f /etc/nginx/sites-available/smilelab-mdr 2>/dev/null && \
  echo -e "${GREEN}✓ Removed /etc/nginx/sites-available/smilelab-mdr${NC}" || \
  echo "  File not found"

# Test and reload Nginx
echo "Testing Nginx configuration..."
sudo nginx -t 2>/dev/null && {
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
} || {
    echo -e "${RED}✗ Nginx configuration error!${NC}"
    echo "Please check /var/log/nginx/error.log"
    echo "Original config backed up to: $BACKUP_DIR/smilelab-mdr.nginx.conf"
}
echo ""

###############################################################################
# STEP 10: Archive application files
###############################################################################
echo -e "${YELLOW}[10/10]${NC} Archiving application files..."

if [ -d /var/www/smilelab-mdr ]; then
    echo "Creating archive of /var/www/smilelab-mdr..."
    sudo tar -czf "$BACKUP_DIR/smilelab-mdr-app-archive.tar.gz" -C /var/www smilelab-mdr 2>/dev/null && \
      echo -e "${GREEN}✓ Application archived to: $BACKUP_DIR/smilelab-mdr-app-archive.tar.gz${NC}" || \
      echo -e "${YELLOW}⚠ Archive creation failed${NC}"

    echo ""
    echo -e "${YELLOW}Ready to remove /var/www/smilelab-mdr?${NC}"
    read -p "Remove application directory? (yes/no): " remove_app

    if [ "$remove_app" == "yes" ]; then
        sudo rm -rf /var/www/smilelab-mdr
        echo -e "${GREEN}✓ Removed /var/www/smilelab-mdr${NC}"
    else
        echo "  Application directory preserved"
    fi
else
    echo "  /var/www/smilelab-mdr not found"
fi
echo ""

###############################################################################
# CLEANUP SUMMARY
###############################################################################
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Cleanup Complete!                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Backup Location:${NC} $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Files Backed Up:${NC}"
ls -lh "$BACKUP_DIR"
echo ""

###############################################################################
# VERIFICATION
###############################################################################
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Verification${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Docker Containers:${NC}"
docker ps -a | grep -E "CONTAINER|smilelab|n8n" || echo "No containers"
echo ""

echo -e "${YELLOW}Docker Images:${NC}"
docker images | grep -E "REPOSITORY|smilelab|dental-lab" || echo "No Smilelab images"
echo ""

echo -e "${YELLOW}Docker Volumes:${NC}"
docker volume ls | grep -E "DRIVER|smilelab" || echo "No Smilelab volumes"
echo ""

echo -e "${YELLOW}Nginx Sites:${NC}"
ls -l /etc/nginx/sites-enabled/ | grep smilelab || echo "No Smilelab Nginx config"
echo ""

echo -e "${YELLOW}n8n Status:${NC}"
if docker ps | grep -q n8n; then
    echo -e "${GREEN}✓ n8n is SAFE and running!${NC}"
    docker ps | grep n8n
else
    echo -e "${RED}✗ n8n not running - please check!${NC}"
fi
echo ""

###############################################################################
# NEXT STEPS
###############################################################################
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Next Steps${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Review verification output above"
echo "2. Confirm n8n is still accessible"
echo "3. If needed, restore from: $BACKUP_DIR"
echo "4. For fresh deployment, follow: DEPLOYMENT-GUIDE.md"
echo ""
echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo ""
