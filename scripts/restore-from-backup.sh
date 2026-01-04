#!/bin/bash

################################################################################
# Smilelab MDR - Database Restoration Script
#
# This script restores a PostgreSQL database from a backup file.
# Can restore from local backups or download from Digital Ocean Spaces.
#
# ⚠️  WARNING: This will OVERWRITE the existing database!
# ⚠️  Make sure you understand what you're doing before running this script.
#
# Usage:
#   ./restore-from-backup.sh <backup-file>
#   ./restore-from-backup.sh s3://smilelab-backups/daily/smilelab_backup_20250101_020000.sql.gz
#   ./restore-from-backup.sh /var/backups/postgresql/smilelab/smilelab_backup_20250101_020000.sql.gz
#
################################################################################

# Exit on any error
set -e

# Configuration
DB_NAME="smilelab_mdr"
DB_USER="postgres"
DB_HOST="localhost"
TEMP_DIR="/tmp/smilelab-restore"

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

show_usage() {
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Examples:"
    echo "  # Restore from local file:"
    echo "  $0 /var/backups/postgresql/smilelab/smilelab_backup_20250101_020000.sql.gz"
    echo ""
    echo "  # Restore from Digital Ocean Spaces:"
    echo "  $0 s3://smilelab-backups/daily/smilelab_backup_20250101_020000.sql.gz"
    echo ""
    echo "  # List available backups in Spaces:"
    echo "  s3cmd ls s3://smilelab-backups/daily/"
    echo ""
    exit 1
}

confirm_restoration() {
    log_warning "========================================="
    log_warning "⚠️  DATABASE RESTORATION WARNING ⚠️"
    log_warning "========================================="
    log_warning "This will COMPLETELY REPLACE the database: $DB_NAME"
    log_warning "ALL current data will be PERMANENTLY DELETED!"
    log_warning "Backup file: $BACKUP_FILE"
    log_warning "========================================="
    echo ""

    read -p "Are you ABSOLUTELY SURE you want to continue? (type 'YES' to confirm): " CONFIRM

    if [ "$CONFIRM" != "YES" ]; then
        log_info "Restoration cancelled by user."
        exit 0
    fi

    log_info "Confirmation received. Proceeding with restoration..."
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if PostgreSQL is running
    if ! pg_isready -h $DB_HOST -U $DB_USER &>/dev/null; then
        log_error "PostgreSQL is not running or not accessible at $DB_HOST"
        exit 1
    fi

    # Check if backup file is from Spaces (starts with s3://)
    if [[ $BACKUP_FILE == s3://* ]]; then
        # Check if s3cmd is installed
        if ! command -v s3cmd &> /dev/null; then
            log_error "s3cmd is not installed. Install with: brew install s3cmd (Mac) or apt install s3cmd (Linux)"
            exit 1
        fi

        # Check if s3cmd is configured
        if [ ! -f "$HOME/.s3cfg" ]; then
            log_error "s3cmd is not configured. Run: s3cmd --configure"
            exit 1
        fi
    else
        # Check if local file exists
        if [ ! -f "$BACKUP_FILE" ]; then
            log_error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
    fi

    log_info "Prerequisites check passed!"
}

download_from_spaces() {
    log_info "Downloading backup from Digital Ocean Spaces..."

    mkdir -p "$TEMP_DIR"
    LOCAL_FILE="$TEMP_DIR/$(basename $BACKUP_FILE)"

    if s3cmd get "$BACKUP_FILE" "$LOCAL_FILE"; then
        BACKUP_FILE="$LOCAL_FILE"
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_info "Download successful! Size: $BACKUP_SIZE"
    else
        log_error "Download from Spaces failed!"
        exit 1
    fi
}

create_pre_restoration_backup() {
    log_info "Creating safety backup of current database..."

    SAFETY_BACKUP="$TEMP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    mkdir -p "$TEMP_DIR"

    if pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$SAFETY_BACKUP"; then
        SAFETY_SIZE=$(du -h "$SAFETY_BACKUP" | cut -f1)
        log_info "Safety backup created: $SAFETY_BACKUP ($SAFETY_SIZE)"
        log_info "If restoration fails, you can restore from: $SAFETY_BACKUP"
    else
        log_warning "Failed to create safety backup. Continuing anyway..."
    fi
}

restore_database() {
    log_info "Restoring database from backup..."
    log_info "Database: $DB_NAME"
    log_info "Backup file: $BACKUP_FILE"

    # Drop existing database (THIS IS DESTRUCTIVE!)
    log_warning "Dropping existing database: $DB_NAME"
    dropdb -h $DB_HOST -U $DB_USER --if-exists $DB_NAME

    # Create fresh database
    log_info "Creating fresh database: $DB_NAME"
    createdb -h $DB_HOST -U $DB_USER $DB_NAME

    # Restore from backup
    log_info "Restoring data from backup (this may take a few minutes)..."
    gunzip < "$BACKUP_FILE" | psql -h $DB_HOST -U $DB_USER -d $DB_NAME &>/dev/null

    log_info "Database restoration completed successfully!"
}

verify_restoration() {
    log_info "Verifying database restoration..."

    # Check if database exists and is accessible
    if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM \"User\";" &>/dev/null; then
        USER_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\";")
        log_info "Database is accessible. User count: $USER_COUNT"
        log_info "✅ Restoration verified successfully!"
    else
        log_error "Database verification failed!"
        exit 1
    fi
}

cleanup_temp_files() {
    if [[ $BACKUP_FILE == $TEMP_DIR/* ]]; then
        log_info "Cleaning up temporary files..."
        rm -f "$BACKUP_FILE"
    fi
}

print_summary() {
    echo ""
    log_info "========================================="
    log_info "Restoration Summary"
    log_info "========================================="
    log_info "Database: $DB_NAME"
    log_info "Restored from: $(basename $1)"
    log_info "Status: ✅ SUCCESS"
    log_info "========================================="
    echo ""
    log_info "⚠️  Don't forget to restart your application if it's running!"
    echo ""
}

################################################################################
# Main Execution
################################################################################

# Check if backup file argument is provided
if [ $# -eq 0 ]; then
    show_usage
fi

BACKUP_FILE="$1"

log_info "========================================="
log_info "Smilelab MDR Database Restoration"
log_info "========================================="
log_info "Started at: $(date)"
echo ""

# Run restoration process
confirm_restoration
check_prerequisites

# Download from Spaces if needed
if [[ $BACKUP_FILE == s3://* ]]; then
    download_from_spaces
fi

create_pre_restoration_backup
restore_database
verify_restoration
cleanup_temp_files
print_summary "$1"

log_info "Restoration completed successfully at: $(date)"

exit 0
