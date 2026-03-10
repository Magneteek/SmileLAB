-- Add missing columns to dentists table that were in schema but never migrated
ALTER TABLE "dentists"
    ADD COLUMN IF NOT EXISTS "taxNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "businessRegistration" TEXT,
    ADD COLUMN IF NOT EXISTS "requiresInvoicing" BOOLEAN NOT NULL DEFAULT true;
