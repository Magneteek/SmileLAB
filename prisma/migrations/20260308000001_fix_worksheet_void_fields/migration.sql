-- Add missing void tracking columns to worksheets table
ALTER TABLE "worksheets"
    ADD COLUMN IF NOT EXISTS "voidReason" TEXT,
    ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "voidedBy" TEXT;
