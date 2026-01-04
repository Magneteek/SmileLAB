-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "patientId" TEXT;

-- CreateIndex
CREATE INDEX "orders_patientId_idx" ON "orders"("patientId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
