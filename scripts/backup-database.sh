#!/bin/bash

##############################################################################
# Database Backup Script
#
# Creates a full PostgreSQL database backup before production reset
# Backup includes all data, schema, and sequences
#
# USAGE:
# ./scripts/backup-database.sh
##############################################################################

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not found in environment"
  exit 1
fi

# Parse DATABASE_URL
DB_URL=$DATABASE_URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backups directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/smilelab_backup_${TIMESTAMP}.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Creating database backup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo ""

# Set password for pg_dump
export PGPASSWORD=$DB_PASS

# Create backup
pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -F p \
  -f $BACKUP_FILE

if [ $? -eq 0 ]; then
  # Get backup file size
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Backup created successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 Backup location: $BACKUP_FILE"
  echo "📦 Backup size: $BACKUP_SIZE"
  echo "📅 Timestamp: $TIMESTAMP"
  echo ""
  echo "💡 To restore this backup later:"
  echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BACKUP_FILE"
  echo ""
  echo "✅ You can now safely run the production reset script"
  echo ""
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Backup failed!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Please check:"
  echo "  1. DATABASE_URL is correct in .env file"
  echo "  2. PostgreSQL is running"
  echo "  3. You have necessary permissions"
  echo "  4. pg_dump is installed (PostgreSQL client tools)"
  echo ""
  exit 1
fi

# Unset password
unset PGPASSWORD
