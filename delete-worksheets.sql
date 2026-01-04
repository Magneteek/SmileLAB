-- Delete all worksheet-related data
-- Run this in Prisma Studio SQL query or psql

BEGIN;

-- Delete worksheet materials first (foreign key)
DELETE FROM "WorksheetMaterial";

-- Delete worksheet products (foreign key)
DELETE FROM "WorksheetProduct";

-- Delete worksheet teeth (foreign key)
DELETE FROM "WorksheetTooth";

-- Delete quality control records (foreign key)
DELETE FROM "QualityControl";

-- Delete worksheets
DELETE FROM "WorkSheet";

COMMIT;

-- Verify deletion
SELECT COUNT(*) as remaining_worksheets FROM "WorkSheet";
