#!/bin/bash

################################################################################
# Smilelab MDR - Localhost Database Backup Script
#
# This script backs up your local PostgreSQL database and uploads to
# Digital Ocean Spaces for off-site storage.
#
# Usage: ./backup-smilelab-local.sh
#
# Setup Required:
# 1. Install s3cmd: brew install s3cmd
# 2. Configure s3cmd with DO Spaces credentials: s3cmd --configure
# 3. Make this script executable: chmod +x backup-smilelab-local.sh
################################################################################

# Exit on any error
set -e

# Configuration
DB_NAME="smilelab_mdr"
DB_USER="postgres"
DB_HOST="localhost"
BACKUP_DIR="$HOME/smilelab-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="smilelab_backup_${DATE}.sql.gz"
RETENTION_DAYS=7  # Keep local backups for 7 days
SPACES_RETENTION_DAYS=90  # Keep Spaces backups for 90 days

# Digital Ocean Spaces configuration
# IMPORTANT: Replace these values after creating your Spaces bucket
SPACES_BUCKET="s3://smilelab-backups"  # Replace with your bucket name
SPACES_REGION="ams3"  # Amsterdam region (closest to Slovenia)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if PostgreSQL is running
    if ! pg_isready -h $DB_HOST -U $DB_USER &>/dev/null; then
        log_error "PostgreSQL is not running or not accessible at $DB_HOST"
        exit 1
    fi

    # Check if s3cmd is installed
    if ! command -v s3cmd &> /dev/null; then
        log_error "s3cmd is not installed. Install with: brew install s3cmd"
        exit 1
    fi

    # Check if s3cmd is configured
    if [ ! -f "$HOME/.s3cfg" ]; then
        log_warning "s3cmd is not configured. Run: s3cmd --configure"
        log_warning "Continuing with local backup only..."
    fi

    log_info "Prerequisites check passed!"
}

create_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

create_database_backup() {
    log_info "Creating database backup..."
    log_info "Database: $DB_NAME"
    log_info "Output: $BACKUP_DIR/$BACKUP_FILENAME"

    # Create compressed backup
    pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/$BACKUP_FILENAME"

    # Check if backup was created successfully
    if [ -f "$BACKUP_DIR/$BACKUP_FILENAME" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
        log_info "Backup created successfully! Size: $BACKUP_SIZE"
    else
        log_error "Backup creation failed!"
        exit 1
    fi
}

upload_to_spaces() {
    if [ ! -f "$HOME/.s3cfg" ]; then
        log_warning "Skipping upload to Spaces (s3cmd not configured)"
        return
    fi

    log_info "Uploading backup to Digital Ocean Spaces..."

    if s3cmd put "$BACKUP_DIR/$BACKUP_FILENAME" "$SPACES_BUCKET/daily/" --region="$SPACES_REGION"; then
        log_info "Upload to Spaces successful!"
    else
        log_error "Upload to Spaces failed!"
        exit 1
    fi
}

cleanup_old_local_backups() {
    log_info "Cleaning up local backups older than $RETENTION_DAYS days..."

    find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

    LOCAL_COUNT=$(find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f | wc -l)
    log_info "Local backups remaining: $LOCAL_COUNT"
}

cleanup_old_spaces_backups() {
    if [ ! -f "$HOME/.s3cfg" ]; then
        return
    fi

    log_info "Cleaning up Spaces backups older than $SPACES_RETENTION_DAYS days..."

    # List all backups in Spaces
    CUTOFF_DATE=$(date -v-${SPACES_RETENTION_DAYS}d +%Y%m%d 2>/dev/null || date -d "$SPACES_RETENTION_DAYS days ago" +%Y%m%d)

    s3cmd ls "$SPACES_BUCKET/daily/" | while read -r line; do
        # Extract filename from s3cmd ls output
        FILENAME=$(echo "$line" | awk '{print $4}')

        # Extract date from filename (smilelab_backup_YYYYMMDD_HHMMSS.sql.gz)
        if [[ $FILENAME =~ smilelab_backup_([0-9]{8})_ ]]; then
            FILE_DATE="${BASH_REMATCH[1]}"

            if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                log_info "Deleting old backup: $FILENAME"
                s3cmd del "$FILENAME"
            fi
        fi
    done
}

print_summary() {
    echo ""
    log_info "========================================="
    log_info "Backup Summary"
    log_info "========================================="
    log_info "Backup file: $BACKUP_FILENAME"
    log_info "Local path: $BACKUP_DIR/$BACKUP_FILENAME"
    if [ -f "$HOME/.s3cfg" ]; then
        log_info "Spaces path: $SPACES_BUCKET/daily/$BACKUP_FILENAME"
    fi
    log_info "Retention: $RETENTION_DAYS days (local), $SPACES_RETENTION_DAYS days (Spaces)"
    log_info "========================================="
    echo ""
}

################################################################################
# Main Execution
################################################################################

log_info "========================================="
log_info "Smilelab MDR Backup Script (Localhost)"
log_info "========================================="
log_info "Started at: $(date)"
echo ""

# Run backup process
check_prerequisites
create_backup_directory
create_database_backup
upload_to_spaces
cleanup_old_local_backups
cleanup_old_spaces_backups
print_summary

log_info "Backup completed successfully at: $(date)"

exit 0
