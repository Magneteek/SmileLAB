-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICIAN', 'QC_INSPECTOR', 'INVOICING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PRODUCTION', 'QC_PENDING', 'QC_APPROVED', 'INVOICED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorksheetStatus" AS ENUM ('DRAFT', 'IN_PRODUCTION', 'QC_PENDING', 'QC_APPROVED', 'QC_REJECTED', 'INVOICED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('CROWN', 'BRIDGE', 'FILLING', 'IMPLANT', 'DENTURE', 'INLAY', 'ONLAY', 'VENEER', 'ORTHODONTICS', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('CERAMIC', 'METAL', 'RESIN', 'COMPOSITE', 'PORCELAIN', 'ZIRCONIA', 'TITANIUM', 'ALLOY', 'ACRYLIC', 'WAX', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialLotStatus" AS ENUM ('AVAILABLE', 'DEPLETED', 'EXPIRED', 'RECALLED');

-- CreateEnum
CREATE TYPE "QCResult" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ANNEX_XIII', 'INVOICE', 'DELIVERY_NOTE', 'QC_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'QC_APPROVE', 'QC_REJECT', 'INVOICE_GENERATE', 'EMAIL_SEND', 'DOCUMENT_GENERATE', 'MATERIAL_ASSIGN', 'STATUS_CHANGE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dentists" (
    "id" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "dentistName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Slovenia',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dentists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "patientCode" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "anonymized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheets" (
    "id" TEXT NOT NULL,
    "worksheetNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "patientId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "WorksheetStatus" NOT NULL DEFAULT 'DRAFT',
    "deviceDescription" TEXT,
    "intendedUse" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "technicalNotes" TEXT,
    "qcNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "worksheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_teeth" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "toothNumber" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "shade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_teeth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "currentPrice" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_products" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtSelection" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "description" TEXT,
    "biocompatible" BOOLEAN NOT NULL DEFAULT true,
    "iso10993Cert" TEXT,
    "ceMarked" BOOLEAN NOT NULL DEFAULT true,
    "ceNumber" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'gram',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lots" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "supplierName" TEXT NOT NULL,
    "quantityReceived" DECIMAL(10,3) NOT NULL,
    "quantityAvailable" DECIMAL(10,3) NOT NULL,
    "status" "MaterialLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_materials" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialLotId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_controls" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "result" "QCResult" NOT NULL DEFAULT 'PENDING',
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aesthetics" BOOLEAN,
    "fit" BOOLEAN,
    "occlusion" BOOLEAN,
    "shade" BOOLEAN,
    "margins" BOOLEAN,
    "notes" TEXT,
    "actionRequired" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT,
    "type" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "generatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 22.00,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "pdfPath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "sentById" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "dentists_clinicName_idx" ON "dentists"("clinicName");

-- CreateIndex
CREATE INDEX "dentists_email_idx" ON "dentists"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientCode_key" ON "patients"("patientCode");

-- CreateIndex
CREATE INDEX "patients_patientCode_idx" ON "patients"("patientCode");

-- CreateIndex
CREATE INDEX "patients_lastName_idx" ON "patients"("lastName");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_dentistId_idx" ON "orders"("dentistId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "worksheets_worksheetNumber_key" ON "worksheets"("worksheetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "worksheets_orderId_key" ON "worksheets"("orderId");

-- CreateIndex
CREATE INDEX "worksheets_worksheetNumber_idx" ON "worksheets"("worksheetNumber");

-- CreateIndex
CREATE INDEX "worksheets_orderId_idx" ON "worksheets"("orderId");

-- CreateIndex
CREATE INDEX "worksheets_dentistId_idx" ON "worksheets"("dentistId");

-- CreateIndex
CREATE INDEX "worksheets_patientId_idx" ON "worksheets"("patientId");

-- CreateIndex
CREATE INDEX "worksheets_status_idx" ON "worksheets"("status");

-- CreateIndex
CREATE INDEX "worksheets_manufactureDate_idx" ON "worksheets"("manufactureDate");

-- CreateIndex
CREATE INDEX "worksheet_teeth_worksheetId_idx" ON "worksheet_teeth"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_teeth_toothNumber_idx" ON "worksheet_teeth"("toothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "worksheet_teeth_worksheetId_toothNumber_key" ON "worksheet_teeth"("worksheetId", "toothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE INDEX "product_price_history_productId_idx" ON "product_price_history"("productId");

-- CreateIndex
CREATE INDEX "product_price_history_effectiveFrom_idx" ON "product_price_history"("effectiveFrom");

-- CreateIndex
CREATE INDEX "worksheet_products_worksheetId_idx" ON "worksheet_products"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_products_productId_idx" ON "worksheet_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_code_idx" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_type_idx" ON "materials"("type");

-- CreateIndex
CREATE INDEX "materials_manufacturer_idx" ON "materials"("manufacturer");

-- CreateIndex
CREATE INDEX "materials_active_idx" ON "materials"("active");

-- CreateIndex
CREATE INDEX "material_lots_materialId_idx" ON "material_lots"("materialId");

-- CreateIndex
CREATE INDEX "material_lots_lotNumber_idx" ON "material_lots"("lotNumber");

-- CreateIndex
CREATE INDEX "material_lots_status_idx" ON "material_lots"("status");

-- CreateIndex
CREATE INDEX "material_lots_arrivalDate_idx" ON "material_lots"("arrivalDate");

-- CreateIndex
CREATE INDEX "material_lots_expiryDate_idx" ON "material_lots"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "material_lots_materialId_lotNumber_key" ON "material_lots"("materialId", "lotNumber");

-- CreateIndex
CREATE INDEX "worksheet_materials_worksheetId_idx" ON "worksheet_materials"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_materials_materialId_idx" ON "worksheet_materials"("materialId");

-- CreateIndex
CREATE INDEX "worksheet_materials_materialLotId_idx" ON "worksheet_materials"("materialLotId");

-- CreateIndex
CREATE INDEX "quality_controls_worksheetId_idx" ON "quality_controls"("worksheetId");

-- CreateIndex
CREATE INDEX "quality_controls_inspectorId_idx" ON "quality_controls"("inspectorId");

-- CreateIndex
CREATE INDEX "quality_controls_result_idx" ON "quality_controls"("result");

-- CreateIndex
CREATE INDEX "quality_controls_inspectionDate_idx" ON "quality_controls"("inspectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentNumber_key" ON "documents"("documentNumber");

-- CreateIndex
CREATE INDEX "documents_worksheetId_idx" ON "documents"("worksheetId");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE INDEX "documents_documentNumber_idx" ON "documents"("documentNumber");

-- CreateIndex
CREATE INDEX "documents_retentionUntil_idx" ON "documents"("retentionUntil");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_worksheetId_key" ON "invoices"("worksheetId");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_worksheetId_idx" ON "invoices"("worksheetId");

-- CreateIndex
CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- CreateIndex
CREATE INDEX "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE INDEX "email_logs_invoiceId_idx" ON "email_logs"("invoiceId");

-- CreateIndex
CREATE INDEX "email_logs_sentById_idx" ON "email_logs"("sentById");

-- CreateIndex
CREATE INDEX "email_logs_recipient_idx" ON "email_logs"("recipient");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_teeth" ADD CONSTRAINT "worksheet_teeth_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_products" ADD CONSTRAINT "worksheet_products_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_products" ADD CONSTRAINT "worksheet_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_lots" ADD CONSTRAINT "material_lots_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_materials" ADD CONSTRAINT "worksheet_materials_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_materials" ADD CONSTRAINT "worksheet_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_materials" ADD CONSTRAINT "worksheet_materials_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
