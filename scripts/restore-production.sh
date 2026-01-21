#!/bin/bash

################################################################################
# Smilelab MDR - Production Restore Script (Digital Ocean Spaces)
#
# Restores a PostgreSQL database from Digital Ocean Spaces backup.
#
# ⚠️  WARNING: This will OVERWRITE the production database!
#
# Usage:
#   ./restore-production.sh                  # Interactive: lists Spaces backups
#   ./restore-production.sh <backup-name>    # Direct: restores specific backup
#
# Examples:
#   ./restore-production.sh
#   ./restore-production.sh smilelab_backup_20260121_020000.sql.gz
################################################################################

set -e

# Configuration
CONTAINER_NAME="smilelab-postgres"
DB_NAME="smilelab_mdr"
DB_USER="postgres"
LOCAL_BACKUP_DIR="/var/backups/smilelab"
TEMP_DIR="/tmp/smilelab-restore"

# Digital Ocean Spaces configuration
SPACES_BUCKET="s3://smilelabv1"
SPACES_ENDPOINT="ams3.digitaloceanspaces.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

################################################################################
# Functions
################################################################################

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_error "PostgreSQL container '${CONTAINER_NAME}' is not running!"
        exit 1
    fi

    if ! command -v s3cmd &> /dev/null; then
        log_error "s3cmd is not installed"
        exit 1
    fi

    log_info "Prerequisites OK ✓"
}

list_spaces_backups() {
    echo ""
    log_info "Available backups in Digital Ocean Spaces:"
    echo ""

    i=1
    while IFS= read -r line; do
        if [[ $line =~ smilelab_backup ]]; then
            DATE_PART=$(echo "$line" | awk '{print $1, $2}')
            SIZE=$(echo "$line" | awk '{print $3}')
            FILENAME=$(basename $(echo "$line" | awk '{print $4}'))
            echo -e "  ${BLUE}[$i]${NC} $FILENAME - $SIZE - $DATE_PART"
            BACKUPS[$i]="$FILENAME"
            ((i++))
        fi
    done < <(s3cmd ls "$SPACES_BUCKET/daily/" --host="$SPACES_ENDPOINT" --host-bucket="%(bucket)s.$SPACES_ENDPOINT" 2>/dev/null | sort -r)

    if [ $i -eq 1 ]; then
        log_warning "No backups found in Spaces!"
        exit 1
    fi
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

    BACKUP_FILENAME="${BACKUPS[$SELECTION]}"
}

confirm_restoration() {
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ⚠️  PRODUCTION DATABASE WARNING ⚠️${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    log_warning "This will COMPLETELY REPLACE the PRODUCTION database!"
    log_warning "ALL current data will be PERMANENTLY DELETED!"
    echo ""
    log_info "Backup to restore: $BACKUP_FILENAME"
    echo ""

    read -p "Type 'YES-RESTORE-PRODUCTION' to confirm: " CONFIRM

    if [ "$CONFIRM" != "YES-RESTORE-PRODUCTION" ]; then
        log_info "Restoration cancelled."
        exit 0
    fi
}

download_backup() {
    log_info "Downloading backup from Spaces..."
    mkdir -p "$TEMP_DIR"

    s3cmd get "$SPACES_BUCKET/daily/$BACKUP_FILENAME" "$TEMP_DIR/$BACKUP_FILENAME" \
        --host="$SPACES_ENDPOINT" --host-bucket="%(bucket)s.$SPACES_ENDPOINT"

    if [ -f "$TEMP_DIR/$BACKUP_FILENAME" ]; then
        SIZE=$(du -h "$TEMP_DIR/$BACKUP_FILENAME" | cut -f1)
        log_info "Download complete: $SIZE"
    else
        log_error "Download failed!"
        exit 1
    fi
}

create_safety_backup() {
    log_info "Creating safety backup of current database..."
    mkdir -p "$LOCAL_BACKUP_DIR"

    SAFETY_FILE="$LOCAL_BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$SAFETY_FILE"

    SIZE=$(du -h "$SAFETY_FILE" | cut -f1)
    log_info "Safety backup created: $SAFETY_FILE ($SIZE)"
}

restore_database() {
    log_info "Stopping application..."
    pm2 stop dental-lab-mdr 2>/dev/null || true

    log_info "Dropping existing database..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);"

    log_info "Creating fresh database..."
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

    log_info "Restoring data (this may take a moment)..."
    gunzip -c "$TEMP_DIR/$BACKUP_FILENAME" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1

    log_info "Database restored ✓"
}

verify_and_restart() {
    log_info "Verifying restoration..."
    USER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' ')
    log_info "User count: $USER_COUNT ✓"

    log_info "Starting application..."
    pm2 start dental-lab-mdr

    log_info "Cleaning up temp files..."
    rm -f "$TEMP_DIR/$BACKUP_FILENAME"
}

################################################################################
# Main Execution
################################################################################

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Smilelab MDR Production Restore${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

check_prerequisites

# Select backup
if [ $# -eq 0 ]; then
    list_spaces_backups
    select_backup
else
    BACKUP_FILENAME="$1"
fi

confirm_restoration
download_backup
create_safety_backup
restore_database
verify_and_restart

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Restoration Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
log_info "Production database has been restored from:"
log_info "  $BACKUP_FILENAME"
echo ""

exit 0
