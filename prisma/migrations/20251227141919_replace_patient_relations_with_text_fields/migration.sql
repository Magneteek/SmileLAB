/*
  Warnings:

  - You are about to drop the column `patientId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `worksheets` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_patientId_fkey";

-- DropForeignKey
ALTER TABLE "worksheets" DROP CONSTRAINT "worksheets_patientId_fkey";

-- DropIndex
DROP INDEX "orders_patientId_idx";

-- DropIndex
DROP INDEX "worksheets_patientId_idx";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "patientId",
ADD COLUMN     "patientName" TEXT;

-- AlterTable
ALTER TABLE "worksheets" DROP COLUMN "patientId",
ADD COLUMN     "patientName" TEXT;
