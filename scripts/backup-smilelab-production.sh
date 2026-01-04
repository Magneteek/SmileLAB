#!/bin/bash

################################################################################
# Smilelab MDR - Production Database Backup Script
#
# This script backs up your production PostgreSQL database and uploads to
# Digital Ocean Spaces for off-site storage.
#
# Designed to run on Digital Ocean droplet via cron job.
#
# Setup Instructions:
# 1. Copy this file to droplet: /usr/local/bin/backup-smilelab-production.sh
# 2. Make executable: chmod +x /usr/local/bin/backup-smilelab-production.sh
# 3. Install s3cmd: apt install s3cmd
# 4. Configure s3cmd: s3cmd --configure
# 5. Schedule with cron: crontab -e
#    Add: 0 2 * * * /usr/local/bin/backup-smilelab-production.sh
#
# Cron schedule runs daily at 2 AM
################################################################################

# Exit on any error
set -e

# Configuration
DB_NAME="smilelab_mdr"
DB_USER="postgres"
DB_HOST="localhost"
BACKUP_DIR="/var/backups/postgresql/smilelab"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="smilelab_backup_${DATE}.sql.gz"
RETENTION_DAYS=7  # Keep local backups for 7 days
SPACES_RETENTION_DAYS=90  # Keep Spaces backups for 90 days
LOG_FILE="/var/log/smilelab-backup.log"

# Digital Ocean Spaces configuration
# IMPORTANT: Replace these values after creating your Spaces bucket
SPACES_BUCKET="s3://smilelab-backups"  # Replace with your bucket name
SPACES_REGION="ams3"  # Amsterdam region

# Optional: Email notifications on failure
# Uncomment and configure if you want email alerts
# ALERT_EMAIL="admin@dentro.si"

################################################################################
# Functions
################################################################################

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

send_alert() {
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Backup failed at $(date)" | mail -s "Smilelab Backup Failed" "$ALERT_EMAIL"
    fi
}

check_prerequisites() {
    log_message "Checking prerequisites..."

    # Check if PostgreSQL is running
    if ! pg_isready -h $DB_HOST -U $DB_USER &>/dev/null; then
        log_error "PostgreSQL is not running or not accessible"
        send_alert
        exit 1
    fi

    # Check if s3cmd is installed
    if ! command -v s3cmd &> /dev/null; then
        log_error "s3cmd is not installed. Install with: apt install s3cmd"
        send_alert
        exit 1
    fi

    # Check if s3cmd is configured
    if [ ! -f "$HOME/.s3cfg" ]; then
        log_error "s3cmd is not configured. Run: s3cmd --configure"
        send_alert
        exit 1
    fi

    log_message "Prerequisites check passed"
}

create_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_message "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

create_database_backup() {
    log_message "Creating database backup: $DB_NAME"

    # Create compressed backup
    if pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/$BACKUP_FILENAME"; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
        log_message "Backup created successfully! Size: $BACKUP_SIZE"
    else
        log_error "Database backup failed!"
        send_alert
        exit 1
    fi
}

upload_to_spaces() {
    log_message "Uploading backup to Digital Ocean Spaces..."

    if s3cmd put "$BACKUP_DIR/$BACKUP_FILENAME" "$SPACES_BUCKET/daily/" --region="$SPACES_REGION" >> "$LOG_FILE" 2>&1; then
        log_message "Upload to Spaces successful!"
    else
        log_error "Upload to Spaces failed!"
        send_alert
        exit 1
    fi
}

cleanup_old_local_backups() {
    log_message "Cleaning up local backups older than $RETENTION_DAYS days..."

    # Find and delete old backups
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

    if [ "$DELETED_COUNT" -gt 0 ]; then
        log_message "Deleted $DELETED_COUNT old local backup(s)"
    fi

    LOCAL_COUNT=$(find "$BACKUP_DIR" -name "smilelab_backup_*.sql.gz" -type f | wc -l)
    log_message "Local backups remaining: $LOCAL_COUNT"
}

cleanup_old_spaces_backups() {
    log_message "Cleaning up Spaces backups older than $SPACES_RETENTION_DAYS days..."

    # Calculate cutoff date (Linux date command)
    CUTOFF_DATE=$(date -d "$SPACES_RETENTION_DAYS days ago" +%Y%m%d)

    # List and delete old backups from Spaces
    s3cmd ls "$SPACES_BUCKET/daily/" 2>/dev/null | while read -r line; do
        FILENAME=$(echo "$line" | awk '{print $4}')

        # Extract date from filename (smilelab_backup_YYYYMMDD_HHMMSS.sql.gz)
        if [[ $FILENAME =~ smilelab_backup_([0-9]{8})_ ]]; then
            FILE_DATE="${BASH_REMATCH[1]}"

            if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
                log_message "Deleting old Spaces backup: $(basename $FILENAME)"
                s3cmd del "$FILENAME" >> "$LOG_FILE" 2>&1
            fi
        fi
    done
}

print_summary() {
    log_message "========================================="
    log_message "Backup Summary"
    log_message "========================================="
    log_message "Backup file: $BACKUP_FILENAME"
    log_message "Local path: $BACKUP_DIR/$BACKUP_FILENAME"
    log_message "Spaces path: $SPACES_BUCKET/daily/$BACKUP_FILENAME"
    log_message "Retention: $RETENTION_DAYS days (local), $SPACES_RETENTION_DAYS days (Spaces)"
    log_message "========================================="
}

################################################################################
# Main Execution
################################################################################

log_message "========================================="
log_message "Smilelab MDR Backup Script (Production)"
log_message "========================================="

# Run backup process
check_prerequisites
create_backup_directory
create_database_backup
upload_to_spaces
cleanup_old_local_backups
cleanup_old_spaces_backups
print_summary

log_message "Backup completed successfully!"

exit 0
