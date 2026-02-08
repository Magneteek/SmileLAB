-- AlterEnum: Simplify ProductCategory to 5 main categories
-- Strategy: Create new enum, migrate data, switch column, drop old enum

-- Step 1: Create new enum type with simplified categories
CREATE TYPE "ProductCategory_new" AS ENUM (
  'FIKSNA_PROTETIKA',
  'SNEMNA_PROTETIKA',
  'IMPLANTOLOGIJA',
  'ESTETIKA',
  'OSTALO'
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE "products" ADD COLUMN "category_new" "ProductCategory_new";

-- Step 3: Migrate existing data to new categories (map old to new)
UPDATE "products" SET "category_new" =
  CASE "category"
    WHEN 'CROWN' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'BRIDGE' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'INLAY' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'ONLAY' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'PROVISIONAL' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'VENEER' THEN 'ESTETIKA'::"ProductCategory_new"
    WHEN 'FILLING' THEN 'FIKSNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'DENTURE' THEN 'SNEMNA_PROTETIKA'::"ProductCategory_new"
    WHEN 'IMPLANT' THEN 'IMPLANTOLOGIJA'::"ProductCategory_new"
    WHEN 'ABUTMENT' THEN 'IMPLANTOLOGIJA'::"ProductCategory_new"
    WHEN 'SPLINT' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'TEMPLATE' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'SERVICE' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'REPAIR' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'MODEL' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'ORTHODONTICS' THEN 'OSTALO'::"ProductCategory_new"
    WHEN 'OTHER' THEN 'OSTALO'::"ProductCategory_new"
    ELSE 'OSTALO'::"ProductCategory_new"
  END;

-- Step 4: Drop old column
ALTER TABLE "products" DROP COLUMN "category";

-- Step 5: Rename new column to original name
ALTER TABLE "products" RENAME COLUMN "category_new" TO "category";

-- Step 6: Drop old enum type
DROP TYPE "ProductCategory";

-- Step 7: Rename new enum type to original name
ALTER TYPE "ProductCategory_new" RENAME TO "ProductCategory";

-- Step 8: Make column NOT NULL (if it was before)
ALTER TABLE "products" ALTER COLUMN "category" SET NOT NULL;
