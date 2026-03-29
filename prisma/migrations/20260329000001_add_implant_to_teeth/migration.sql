-- Add implant flag to worksheet_teeth
ALTER TABLE "worksheet_teeth" ADD COLUMN "implant" BOOLEAN NOT NULL DEFAULT false;
