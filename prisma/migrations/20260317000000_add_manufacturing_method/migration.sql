-- Add ManufacturingMethod enum and field to worksheets
-- Safe migration: adds nullable enum column with default MILLING

CREATE TYPE "ManufacturingMethod" AS ENUM ('MILLING', 'PRINTING');

ALTER TABLE "worksheets" ADD COLUMN "manufacturingMethod" "ManufacturingMethod" NOT NULL DEFAULT 'MILLING';
