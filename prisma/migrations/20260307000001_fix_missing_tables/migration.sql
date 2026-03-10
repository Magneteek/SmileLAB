-- Fix missing tables that were added to schema.prisma but never migrated

-- CreateTable: lab_configuration (singleton for Annex XIII & invoices)
CREATE TABLE "lab_configuration" (
    "id" TEXT NOT NULL,
    "laboratoryName" TEXT NOT NULL,
    "laboratoryId" TEXT,
    "laboratoryLicense" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "technicianIdNumber" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Slovenia',
    "region" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "responsiblePersonName" TEXT NOT NULL,
    "responsiblePersonTitle" TEXT NOT NULL,
    "responsiblePersonLicense" TEXT,
    "responsiblePersonEmail" TEXT,
    "responsiblePersonPhone" TEXT,
    "signaturePath" TEXT,
    "logoPath" TEXT,
    "defaultPaymentTerms" INTEGER NOT NULL DEFAULT 30,
    "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 22.00,
    "invoiceLegalTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "lab_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bank_accounts (multiple bank accounts per lab config)
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "labConfigurationId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swiftBic" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_accounts_labConfigurationId_idx" ON "bank_accounts"("labConfigurationId");
CREATE INDEX "bank_accounts_isPrimary_idx" ON "bank_accounts"("isPrimary");
CREATE INDEX "bank_accounts_displayOrder_idx" ON "bank_accounts"("displayOrder");

ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_labConfigurationId_fkey"
    FOREIGN KEY ("labConfigurationId") REFERENCES "lab_configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: invoice_line_items
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "worksheetId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "lineType" TEXT NOT NULL DEFAULT 'product',
    "productCode" TEXT,
    "productName" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");
CREATE INDEX "invoice_line_items_worksheetId_idx" ON "invoice_line_items"("worksheetId");
CREATE INDEX "invoice_line_items_lineType_idx" ON "invoice_line_items"("lineType");
CREATE INDEX "invoice_line_items_position_idx" ON "invoice_line_items"("position");

ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_worksheetId_fkey"
    FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: worksheet_product_materials (many-to-many junction with LOT tracking)
CREATE TABLE "worksheet_product_materials" (
    "id" TEXT NOT NULL,
    "worksheetProductId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialLotId" TEXT,
    "quantityUsed" DECIMAL(10,3) NOT NULL,
    "toothNumber" TEXT,
    "notes" TEXT,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "worksheet_product_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worksheet_product_materials_worksheetProductId_idx" ON "worksheet_product_materials"("worksheetProductId");
CREATE INDEX "worksheet_product_materials_materialId_idx" ON "worksheet_product_materials"("materialId");
CREATE INDEX "worksheet_product_materials_materialLotId_idx" ON "worksheet_product_materials"("materialLotId");

ALTER TABLE "worksheet_product_materials" ADD CONSTRAINT "worksheet_product_materials_worksheetProductId_fkey"
    FOREIGN KEY ("worksheetProductId") REFERENCES "worksheet_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worksheet_product_materials" ADD CONSTRAINT "worksheet_product_materials_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worksheet_product_materials" ADD CONSTRAINT "worksheet_product_materials_materialLotId_fkey"
    FOREIGN KEY ("materialLotId") REFERENCES "material_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
