-- Migrate INVOICED worksheets to DELIVERED status
-- This updates all worksheets that have INVOICED status to DELIVERED
-- Run this before applying the schema changes that remove INVOICED from the enum

BEGIN;

-- Update all worksheets with INVOICED status to DELIVERED
UPDATE "worksheets"
SET status = 'DELIVERED', "updatedAt" = NOW()
WHERE status = 'INVOICED';

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % worksheet(s) from INVOICED to DELIVERED', updated_count;
END $$;

COMMIT;
