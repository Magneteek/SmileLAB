-- Add missing enum values to WorksheetStatus
ALTER TYPE "WorksheetStatus" ADD VALUE IF NOT EXISTS 'INVOICED';
ALTER TYPE "WorksheetStatus" ADD VALUE IF NOT EXISTS 'VOIDED';
