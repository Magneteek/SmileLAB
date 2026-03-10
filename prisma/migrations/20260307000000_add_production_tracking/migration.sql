-- Add BOTH to ImpressionType enum
ALTER TYPE "ImpressionType" ADD VALUE 'BOTH';

-- CreateEnum: ScanSource
CREATE TYPE "ScanSource" AS ENUM ('MEDIT', 'SHINING3D', 'GOOGLE_DRIVE', 'THREESHAPE', 'OTHER');

-- CreateEnum: ProductionType
CREATE TYPE "ProductionType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum: PartnerType
CREATE TYPE "PartnerType" AS ENUM ('DESIGN', 'MILLING', 'BOTH');

-- CreateTable: ExternalPartner
CREATE TABLE "external_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_partners_isActive_idx" ON "external_partners"("isActive");
CREATE INDEX "external_partners_type_idx" ON "external_partners"("type");

-- AlterTable: Add production tracking fields to worksheets
ALTER TABLE "worksheets"
    ADD COLUMN "scanSource" "ScanSource",
    ADD COLUMN "scanReference" TEXT,
    ADD COLUMN "designType" "ProductionType" NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN "designPartnerId" TEXT,
    ADD COLUMN "designSentAt" TIMESTAMP(3),
    ADD COLUMN "millingType" "ProductionType" NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN "millingPartnerId" TEXT,
    ADD COLUMN "millingSentAt" TIMESTAMP(3),
    ADD COLUMN "scanReceivedAt" TIMESTAMP(3),
    ADD COLUMN "designCompletedAt" TIMESTAMP(3),
    ADD COLUMN "millingReceivedAt" TIMESTAMP(3);

-- CreateIndex for new FK columns
CREATE INDEX "worksheets_designPartnerId_idx" ON "worksheets"("designPartnerId");
CREATE INDEX "worksheets_millingPartnerId_idx" ON "worksheets"("millingPartnerId");

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_designPartnerId_fkey"
    FOREIGN KEY ("designPartnerId") REFERENCES "external_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_millingPartnerId_fkey"
    FOREIGN KEY ("millingPartnerId") REFERENCES "external_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
