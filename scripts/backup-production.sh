#!/bin/bash

################################################################################
# Smilelab MDR - Production Backup Script (Digital Ocean Spaces)
#
# Creates a backup of the PostgreSQL database and uploads to DO Spaces.
# Designed to run on the production Digital Ocean droplet.
#
# Setup Required:
# 1. Install s3cmd: apt install s3cmd
# 2. Configure s3cmd: s3cmd --configure
#    - Access Key: (from DO Spaces API keys)
#    - Secret Key: (from DO Spaces API keys)
#    - Default Region: ams3
#    - S3 Endpoint: ams3.digitaloceanspaces.com
#    - DNS-style: %(bucket)s.ams3.digitaloceanspaces.com
# 3. Create DO Spaces bucket: smilelab-backups
# 4. Make script executable: chmod +x backup-production.sh
# 5. Add to crontab for daily backups (see bottom of script)
#
# Usage: ./backup-production.sh
################################################################################

set -e

# Configuration
CONTAINER_NAME="smilelab-postgres"
DB_NAME="smilelab_mdr"
DB_USER="postgres"
BACKUP_DIR="/var/backups/smilelab"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="smilelab_backup_${DATE}.sql.gz"
LOCAL_RETENTION_DAYS=7      # Keep local backups for 7 days
SPACES_RETENTION_DAYS=90    # Keep Spaces backups for 90 days

# Digital Ocean Spaces configuration
SPACES_BUCKET="s3://smilelabv1"
SPACES_ENDPOINT="ams3.digitaloceanspaces.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"; }

################################################################################
# Main Execution
################################################################################

log_info "========================================="
log_info "Smilelab MDR Production Backup"
log_info "========================================="

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "PostgreSQL container '${CONTAINER_NAME}' is not running!"
    exit 1
fi

if ! command -v s3cmd &> /dev/null; then
    log_error "s3cmd is not installed. Install with: apt install s3cmd"
    exit 1
fi

if [ ! -f "$HOME/.s3cfg" ]; then
    log_error "s3cmd is not configured. Run: s3cmd --configure"
    exit 1
fi

log_info "Prerequisites OK ✓"

# Step 2: Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 3: Create database backup
log_info "Creating database backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_FILENAME"

if [ -f "$BACKUP_DIR/$BACKUP_FILENAME" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
    log_info "Backup created: $BACKUP_FILENAME ($BACKUP_SIZE)"
else
    log_error "Backup creation failed!"
    exit 1
fi

# Step 4: Upload to Digital Ocean Spaces
log_info "Uploading to Digital Ocean Spaces..."
if s3cmd put "$BACKUP_DIR/$BACKUP_FILENAME" "$SPACES_BUCKET/daily/" --host="$SPACES_ENDPOINT" --host-bucket="%(bucket)s.$SPACES_ENDPOINT"; then
    log_info "Upload to Spaces successful ✓"
else
    log_error "Upload to Spaces failed!"
    # Don't exit - keep the local backup at least
fi

# Step 5: Clean up old local backups
log_info "Cleaning up local backups older than $LOCAL_RETENTION_DAYS days..."
DELETED_LOCAL=$(find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f -mtime +$LOCAL_RETENTION_DAYS -delete -print | wc -l)
log_info "Deleted $DELETED_LOCAL old local backup(s)"

# Step 6: Clean up old Spaces backups
log_info "Cleaning up Spaces backups older than $SPACES_RETENTION_DAYS days..."
CUTOFF_DATE=$(date -d "$SPACES_RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || date -v-${SPACES_RETENTION_DAYS}d +%Y%m%d)

s3cmd ls "$SPACES_BUCKET/daily/" --host="$SPACES_ENDPOINT" --host-bucket="%(bucket)s.$SPACES_ENDPOINT" 2>/dev/null | while read -r line; do
    FILENAME=$(echo "$line" | awk '{print $4}')
    if [[ $FILENAME =~ smilelab_backup_([0-9]{8})_ ]]; then
        FILE_DATE="${BASH_REMATCH[1]}"
        if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
            log_info "Deleting old backup: $(basename $FILENAME)"
            s3cmd del "$FILENAME" --host="$SPACES_ENDPOINT" --host-bucket="%(bucket)s.$SPACES_ENDPOINT" 2>/dev/null
        fi
    fi
done

# Summary
log_info "========================================="
log_info "Backup Summary"
log_info "========================================="
log_info "Local:  $BACKUP_DIR/$BACKUP_FILENAME"
log_info "Spaces: $SPACES_BUCKET/daily/$BACKUP_FILENAME"
log_info "Size:   $BACKUP_SIZE"
log_info "========================================="
log_info "Backup completed successfully!"

exit 0

################################################################################
# CRON SETUP INSTRUCTIONS
################################################################################
#
# To set up automated daily backups at 2:00 AM:
#
# 1. Open crontab editor:
#    crontab -e
#
# 2. Add this line:
#    0 2 * * * /path/to/dental-lab-mdr/scripts/backup-production.sh >> /var/log/smilelab-backup.log 2>&1
#
# 3. Verify crontab:
#    crontab -l
#
# 4. Check logs:
#    tail -f /var/log/smilelab-backup.log
#
################################################################################
