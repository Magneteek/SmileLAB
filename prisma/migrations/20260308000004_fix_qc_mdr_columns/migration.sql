-- Add missing MDR compliance columns to quality_controls table
ALTER TABLE "quality_controls"
    ADD COLUMN IF NOT EXISTS "emdnCode" TEXT NOT NULL DEFAULT 'Q010206 - Dental Prostheses',
    ADD COLUMN IF NOT EXISTS "riskClass" TEXT NOT NULL DEFAULT 'Class IIa',
    ADD COLUMN IF NOT EXISTS "annexIDeviations" TEXT,
    ADD COLUMN IF NOT EXISTS "documentVersion" TEXT NOT NULL DEFAULT '1.0';
