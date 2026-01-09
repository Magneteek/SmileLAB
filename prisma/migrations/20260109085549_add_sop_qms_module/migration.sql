-- CreateEnum
CREATE TYPE "SOPCategory" AS ENUM ('PRODUCTION', 'EQUIPMENT', 'MATERIAL', 'QUALITY', 'DOCUMENTATION', 'PERSONNEL', 'RISK_MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SOPStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STAFF';

-- CreateTable
CREATE TABLE "sops" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "SOPCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "pdfPath" TEXT,
    "versionNumber" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "status" "SOPStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "retentionUntil" TIMESTAMP(3),

    CONSTRAINT "sops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_acknowledgments" (
    "id" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "sop_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sops_code_key" ON "sops"("code");

-- CreateIndex
CREATE INDEX "sops_category_idx" ON "sops"("category");

-- CreateIndex
CREATE INDEX "sops_status_idx" ON "sops"("status");

-- CreateIndex
CREATE INDEX "sops_createdById_idx" ON "sops"("createdById");

-- CreateIndex
CREATE INDEX "sop_acknowledgments_userId_idx" ON "sop_acknowledgments"("userId");

-- CreateIndex
CREATE INDEX "sop_acknowledgments_sopId_idx" ON "sop_acknowledgments"("sopId");

-- CreateIndex
CREATE UNIQUE INDEX "sop_acknowledgments_sopId_userId_key" ON "sop_acknowledgments"("sopId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- AddForeignKey
ALTER TABLE "sops" ADD CONSTRAINT "sops_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sops" ADD CONSTRAINT "sops_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_acknowledgments" ADD CONSTRAINT "sop_acknowledgments_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "sops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_acknowledgments" ADD CONSTRAINT "sop_acknowledgments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
