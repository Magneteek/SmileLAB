#!/bin/bash

################################################################################
# Smilelab MDR - Docker PostgreSQL Backup Script
#
# Creates a backup of the PostgreSQL database running in Docker.
# Backups are stored in ~/smilelab-backups/ with timestamps.
#
# Usage: ./backup-docker.sh
################################################################################

set -e

# Configuration
CONTAINER_NAME="smilelab-postgres"
DB_NAME="smilelab_mdr"
DB_USER="postgres"
BACKUP_DIR="$HOME/smilelab-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="smilelab_backup_${DATE}.sql"
BACKUP_FILENAME_GZ="${BACKUP_FILENAME}.gz"
RETENTION_DAYS=30  # Keep backups for 30 days

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

################################################################################
# Main Execution
################################################################################

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Smilelab MDR Database Backup${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Step 1: Check if Docker container is running
log_step "1. Checking Docker container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "PostgreSQL container '${CONTAINER_NAME}' is not running!"
    log_info "Start it with: docker compose up -d"
    exit 1
fi
log_info "Container '${CONTAINER_NAME}' is running ✓"

# Step 2: Create backup directory
log_step "2. Creating backup directory..."
mkdir -p "$BACKUP_DIR"
log_info "Backup directory: $BACKUP_DIR ✓"

# Step 3: Create database backup
log_step "3. Creating database backup..."
log_info "Database: $DB_NAME"
log_info "Output file: $BACKUP_FILENAME_GZ"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_FILENAME_GZ"

if [ -f "$BACKUP_DIR/$BACKUP_FILENAME_GZ" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME_GZ" | cut -f1)
    log_info "Backup created successfully! Size: $BACKUP_SIZE ✓"
else
    log_error "Backup creation failed!"
    exit 1
fi

# Step 4: Clean up old backups
log_step "4. Cleaning up old backups..."
OLD_COUNT=$(find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_COUNT" -gt 0 ]; then
    find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    log_info "Deleted $OLD_COUNT old backup(s) ✓"
else
    log_info "No old backups to clean up ✓"
fi

# Step 5: Show summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Backup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
log_info "Backup file: $BACKUP_DIR/$BACKUP_FILENAME_GZ"
log_info "File size: $BACKUP_SIZE"
log_info "Retention: $RETENTION_DAYS days"
echo ""

# List recent backups
log_info "Recent backups:"
ls -lh "$BACKUP_DIR"/smilelab_backup_*.sql.gz 2>/dev/null | tail -5 | while read line; do
    echo "  $line"
done
echo ""

exit 0
