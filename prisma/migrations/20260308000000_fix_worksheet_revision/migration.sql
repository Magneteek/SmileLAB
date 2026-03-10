-- Add missing revision column to worksheets table
ALTER TABLE "worksheets"
    ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'worksheets_worksheetNumber_revision_key'
    ) THEN
        ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_worksheetNumber_revision_key" UNIQUE ("worksheetNumber", "revision");
    END IF;
END$$;
