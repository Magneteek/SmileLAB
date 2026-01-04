-- AlterTable
ALTER TABLE "worksheet_materials" ADD COLUMN     "worksheetProductId" TEXT,
ALTER COLUMN "materialLotId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "worksheet_materials_worksheetProductId_idx" ON "worksheet_materials"("worksheetProductId");

-- AddForeignKey
ALTER TABLE "worksheet_materials" ADD CONSTRAINT "worksheet_materials_worksheetProductId_fkey" FOREIGN KEY ("worksheetProductId") REFERENCES "worksheet_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
