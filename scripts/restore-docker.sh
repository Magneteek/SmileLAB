#!/bin/bash

################################################################################
# Smilelab MDR - Docker PostgreSQL Restore Script
#
# Restores a PostgreSQL database from a backup file.
#
# ⚠️  WARNING: This will OVERWRITE the existing database!
#
# Usage:
#   ./restore-docker.sh                     # Interactive: shows list of backups
#   ./restore-docker.sh <backup-file>       # Direct: restores specific file
#
# Examples:
#   ./restore-docker.sh
#   ./restore-docker.sh ~/smilelab-backups/smilelab_backup_20260121_120000.sql.gz
################################################################################

set -e

# Configuration
CONTAINER_NAME="smilelab-postgres"
DB_NAME="smilelab_mdr"
DB_USER="postgres"
BACKUP_DIR="$HOME/smilelab-backups"

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
# Functions
################################################################################

show_available_backups() {
    echo ""
    log_info "Available backups in $BACKUP_DIR:"
    echo ""

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
        log_warning "No backup files found!"
        log_info "Run ./backup-docker.sh first to create a backup."
        exit 1
    fi

    # List backups with numbers
    i=1
    for backup in $(ls -t "$BACKUP_DIR"/smilelab_backup_*.sql.gz 2>/dev/null); do
        SIZE=$(du -h "$backup" | cut -f1)
        DATE=$(basename "$backup" | sed 's/smilelab_backup_\([0-9]*\)_\([0-9]*\).*/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
        echo -e "  ${BLUE}[$i]${NC} $(basename $backup) - ${SIZE} - ${DATE}"
        BACKUPS[$i]="$backup"
        ((i++))
    done
    echo ""
}

select_backup() {
    read -p "Enter backup number to restore (or 'q' to quit): " SELECTION

    if [ "$SELECTION" = "q" ]; then
        log_info "Cancelled."
        exit 0
    fi

    if [[ ! "$SELECTION" =~ ^[0-9]+$ ]] || [ -z "${BACKUPS[$SELECTION]}" ]; then
        log_error "Invalid selection!"
        exit 1
    fi

    BACKUP_FILE="${BACKUPS[$SELECTION]}"
}

confirm_restoration() {
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ⚠️  DATABASE RESTORATION WARNING ⚠️${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    log_warning "This will COMPLETELY REPLACE the database: $DB_NAME"
    log_warning "ALL current data will be PERMANENTLY DELETED!"
    echo ""
    log_info "Backup to restore: $(basename $BACKUP_FILE)"
    echo ""

    read -p "Type 'YES' to confirm restoration: " CONFIRM

    if [ "$CONFIRM" != "YES" ]; then
        log_info "Restoration cancelled."
        exit 0
    fi
}

################################################################################
# Main Execution
################################################################################

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Smilelab MDR Database Restore${NC}"
echo -e "${BLUE}=========================================${NC}"

# Step 1: Check if Docker container is running
log_step "1. Checking Docker container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "PostgreSQL container '${CONTAINER_NAME}' is not running!"
    log_info "Start it with: docker compose up -d"
    exit 1
fi
log_info "Container '${CONTAINER_NAME}' is running ✓"

# Step 2: Select backup file
if [ $# -eq 0 ]; then
    # Interactive mode
    show_available_backups
    select_backup
else
    # Direct mode
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Step 3: Confirm
confirm_restoration

# Step 4: Create safety backup
log_step "2. Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$SAFETY_BACKUP"
SAFETY_SIZE=$(du -h "$SAFETY_BACKUP" | cut -f1)
log_info "Safety backup created: $SAFETY_BACKUP ($SAFETY_SIZE)"
log_info "If something goes wrong, restore from this file."

# Step 5: Drop and recreate database
log_step "3. Dropping existing database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);"
log_info "Database dropped ✓"

log_step "4. Creating fresh database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
log_info "Database created ✓"

# Step 6: Restore from backup
log_step "5. Restoring from backup..."
log_info "This may take a moment..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1
log_info "Data restored ✓"

# Step 7: Verify
log_step "6. Verifying restoration..."
USER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' ')
log_info "User count in restored database: $USER_COUNT ✓"

# Done
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Restoration Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
log_info "Database '$DB_NAME' has been restored."
log_info "Safety backup: $SAFETY_BACKUP"
echo ""
log_warning "Remember to restart the application:"
log_info "  pm2 restart dental-lab-mdr"
echo ""

exit 0
