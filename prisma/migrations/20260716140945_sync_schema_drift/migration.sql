-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'FINALIZED';

-- AlterEnum
BEGIN;
CREATE TYPE "ProductCategory_new" AS ENUM ('FIKSNA_PROTETIKA', 'SNEMNA_PROTETIKA', 'IMPLANTOLOGIJA', 'ESTETIKA', 'OSTALO');
ALTER TABLE "products" ALTER COLUMN "category" TYPE "ProductCategory_new" USING ("category"::text::"ProductCategory_new");
ALTER TYPE "ProductCategory" RENAME TO "ProductCategory_old";
ALTER TYPE "ProductCategory_new" RENAME TO "ProductCategory";
DROP TYPE "ProductCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WorksheetStatus_new" AS ENUM ('DRAFT', 'IN_PRODUCTION', 'QC_PENDING', 'QC_APPROVED', 'QC_REJECTED', 'DELIVERED', 'CANCELLED', 'VOIDED');
ALTER TABLE "worksheets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "worksheets" ALTER COLUMN "status" TYPE "WorksheetStatus_new" USING ("status"::text::"WorksheetStatus_new");
ALTER TYPE "WorksheetStatus" RENAME TO "WorksheetStatus_old";
ALTER TYPE "WorksheetStatus_new" RENAME TO "WorksheetStatus";
DROP TYPE "WorksheetStatus_old";
ALTER TABLE "worksheets" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_worksheetId_fkey";

-- DropForeignKey
ALTER TABLE "worksheet_materials" DROP CONSTRAINT "worksheet_materials_worksheetProductId_fkey";

-- DropIndex
DROP INDEX "invoices_worksheetId_idx";

-- DropIndex
DROP INDEX "invoices_worksheetId_key";

-- DropIndex
DROP INDEX "quality_controls_worksheetId_idx";

-- DropIndex
DROP INDEX "sops_code_key";

-- DropIndex
DROP INDEX "worksheet_materials_worksheetProductId_idx";

-- DropIndex
DROP INDEX "worksheets_orderId_key";

-- DropIndex
DROP INDEX "worksheets_worksheetNumber_key";

-- AlterTable
ALTER TABLE "dentists" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "paymentTerms" SET DEFAULT 15;

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "customNote" TEXT,
ADD COLUMN     "dentistId" TEXT;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "worksheetId",
ADD COLUMN     "dentistId" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "discountRate" DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "issuedBy" TEXT NOT NULL DEFAULT 'Rommy Balzan Verbič',
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "invoiceNumber" DROP NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "lab_configuration" ADD COLUMN     "euVatId" TEXT,
ADD COLUMN     "reverseChargeLegalTerms" TEXT;

-- AlterTable
ALTER TABLE "sops" DROP COLUMN "retentionUntil";

-- AlterTable
ALTER TABLE "worksheet_materials" DROP COLUMN "worksheetProductId";

-- AlterTable
ALTER TABLE "worksheet_teeth" ADD COLUMN     "shadeGingival" TEXT;

-- AlterTable
ALTER TABLE "worksheets" ADD COLUMN     "shadeCervical" TEXT,
ADD COLUMN     "shadeIncisal" TEXT;

-- CreateTable
CREATE TABLE "email_log_documents" (
    "id" TEXT NOT NULL,
    "emailLogId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "email_log_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_log_documents_emailLogId_idx" ON "email_log_documents"("emailLogId");

-- CreateIndex
CREATE INDEX "email_log_documents_documentId_idx" ON "email_log_documents"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "email_log_documents_emailLogId_documentId_key" ON "email_log_documents"("emailLogId", "documentId");

-- CreateIndex
CREATE INDEX "email_logs_dentistId_idx" ON "email_logs"("dentistId");

-- CreateIndex
CREATE INDEX "invoices_dentistId_idx" ON "invoices"("dentistId");

-- CreateIndex
CREATE INDEX "invoices_isDraft_idx" ON "invoices"("isDraft");

-- CreateIndex
CREATE UNIQUE INDEX "quality_controls_worksheetId_key" ON "quality_controls"("worksheetId");

-- CreateIndex
CREATE INDEX "sops_code_idx" ON "sops"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sops_code_versionNumber_key" ON "sops"("code", "versionNumber");

-- CreateIndex
CREATE INDEX "worksheets_orderId_deletedAt_idx" ON "worksheets"("orderId", "deletedAt");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log_documents" ADD CONSTRAINT "email_log_documents_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "email_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log_documents" ADD CONSTRAINT "email_log_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

