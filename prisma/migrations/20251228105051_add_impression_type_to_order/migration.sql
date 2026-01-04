-- CreateEnum
CREATE TYPE "ImpressionType" AS ENUM ('PHYSICAL_IMPRINT', 'DIGITAL_SCAN');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "impressionType" "ImpressionType" NOT NULL DEFAULT 'PHYSICAL_IMPRINT';
