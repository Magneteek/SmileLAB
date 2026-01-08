/**
 * EU MDR Annex XIII PDF Generator
 *
 * Generates Manufacturer's Statement for Custom-Made Devices
 * Compliant with Regulation (EU) 2017/745 Annex XIII
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import type { Document as PrismaDocument, DocumentType } from '@prisma/client';

// ============================================================================
// INTERFACES
// ============================================================================

interface AnnexXIIIData {
  // Document metadata
  documentId: string;
  worksheetNumber: string;
  generationDate: string;
  retentionUntil: string;
  generatedBy: string;

  // Laboratory information (from lab configuration)
  lab: {
    laboratoryName: string;
    laboratoryId?: string | null;
    laboratoryLicense?: string | null;
    registrationNumber?: string | null;
    taxId?: string | null;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website?: string | null;
    logoPath?: string | null;
    signaturePath?: string | null;
    bankAccount?: string | null;
    bankSwift?: string | null;
    responsiblePersonName: string;
    responsiblePersonTitle: string;
    responsiblePersonLicense?: string | null;
    responsiblePersonEmail?: string | null;
    responsiblePersonPhone?: string | null;
  };

  // Device information
  deviceDescription: string;
  intendedUse: string;
  manufactureDate: string;
  deliveryDate?: string | null;
  patientName: string;
  orderNumber?: string;

  // Dentist information
  dentist: {
    name: string;
    licenseNumber?: string | null;
    clinicName: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    email: string;
    phone: string;
  };

  // Products
  products: Array<{
    code: string;
    name: string;
    quantity: number;
    teeth?: string;
  }>;

  // Materials (CRITICAL for traceability)
  materials: Array<{
    code: string;
    name: string;
    manufacturer: string;
    lotNumber?: string | null;
    expiryDate?: string | null;
    quantityUsed: string;
    unit: string;
    toothNumber?: string | null;
    ceMarking: boolean;
    biocompatible: boolean;
    productName: string;
  }>;

  // Quality control
  qcInspection?: {
    inspectorName: string;
    inspectionDate: string;
    result: string;
    notes?: string | null;
    // EU MDR Annex XIII Compliance Fields
    emdnCode: string;
    riskClass: string;
    annexIDeviations?: string | null;
    documentVersion: string;
  };

  // Translations
  t: Record<string, string>;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Annex XIII PDF for a worksheet
 *
 * @param worksheetId - Worksheet ID
 * @param userId - User generating the document
 * @param locale - Locale for translations (default: 'en')
 * @returns Created Document record
 */
export async function generateAnnexXIII(
  worksheetId: string,
  userId: string,
  locale: string = 'en'
): Promise<PrismaDocument> {
  try {
    console.log(`[Annex XIII] Starting generation for worksheet ${worksheetId}`);

    // Fetch lab configuration (will throw if not configured)
    const labConfig = await getLabConfigurationOrThrow();
    console.log(`[Annex XIII] Lab configuration loaded: ${labConfig.laboratoryName}`);

    // Fetch worksheet with all relations
    const worksheet = await fetchWorksheetData(worksheetId);
    console.log(`[Annex XIII] Worksheet data loaded: ${worksheet.worksheetNumber}`);

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Load translations from JSON files using require for reliability
    const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
    const messagesContent = await fs.readFile(messagesPath, 'utf-8');
    const messages = JSON.parse(messagesContent);
    const translations = messages.annexPdf || {};
    console.log(`[Annex XIII] Translations loaded for locale: ${locale}`, Object.keys(translations).length, 'keys');

    // Prepare template data
    const data = await prepareTemplateData(worksheet, labConfig, user.name, translations);
    console.log(`[Annex XIII] Template data prepared with ${data.materials.length} materials`);

    // Compile Handlebars template
    const html = await compileTemplate(data);
    console.log(`[Annex XIII] Template compiled successfully`);

    // Generate PDF using Puppeteer
    const pdfBuffer = await generatePDF(html);
    console.log(`[Annex XIII] PDF generated: ${pdfBuffer.length} bytes`);

    // Save to database
    const document = await saveDocument(worksheetId, pdfBuffer, userId);
    console.log(`[Annex XIII] Document saved to database: ${document.id}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'Document',
        entityId: document.id,
        newValues: JSON.stringify({
          type: 'ANNEX_XIII',
          worksheetId,
          retentionUntil: document.retentionUntil,
        }),
      },
    });

    console.log(`[Annex XIII] Generation complete for ${worksheet.worksheetNumber}`);
    return document;
  } catch (error) {
    console.error('[Annex XIII] Generation failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch worksheet with all required relations
 */
async function fetchWorksheetData(worksheetId: string) {
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    include: {
      order: {
        include: {
          dentist: true,
        },
      },
      products: {
        include: {
          product: true,
          productMaterials: {
            include: {
              material: true,
              materialLot: true,
            },
          },
        },
      },
      materials: {
        include: {
          material: true,
          materialLot: true,
        },
      },
      teeth: {
        orderBy: {
          toothNumber: 'asc',
        },
      },
      qualityControls: {
        where: {
          result: {
            in: ['APPROVED', 'CONDITIONAL'],
          },
        },
        orderBy: {
          inspectionDate: 'desc',
        },
        take: 1,
        include: {
          inspector: true,
        },
      },
      createdBy: true,  // Include technician (worksheet creator)
    },
  });

  if (!worksheet) {
    throw new Error(`Worksheet ${worksheetId} not found`);
  }

  if (!worksheet.order || !worksheet.order.dentist) {
    throw new Error('Worksheet must have an associated order and dentist');
  }

  return worksheet;
}

/**
 * Convert image file to base64 data URI for PDF embedding
 */
async function imageToBase64(filePath: string): Promise<string | null> {
  try {
    console.log(`[Annex XIII] Converting image to base64: ${filePath}`);

    // Convert public URL path to filesystem path
    // If path starts with /, it's a public URL (e.g., /uploads/lab-config/logo.jpg)
    // Convert it to public/uploads/lab-config/logo.jpg
    let absolutePath: string;
    if (filePath.startsWith('/')) {
      // Remove leading slash and prepend 'public/'
      absolutePath = path.join(process.cwd(), 'public', filePath.slice(1));
    } else {
      // If no leading slash, treat as relative from project root
      absolutePath = path.join(process.cwd(), filePath);
    }

    console.log(`[Annex XIII] Reading image from: ${absolutePath}`);
    const imageBuffer = await fs.readFile(absolutePath);
    const base64 = imageBuffer.toString('base64');

    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' :
                     ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.svg' ? 'image/svg+xml' : 'image/png';

    const dataUri = `data:${mimeType};base64,${base64}`;
    console.log(`[Annex XIII] ✅ Image converted successfully (${(base64.length / 1024).toFixed(2)} KB, ${mimeType})`);

    return dataUri;
  } catch (error) {
    console.error('[Annex XIII] ❌ Failed to convert image to base64:', error);
    console.error('[Annex XIII] File path attempted:', filePath);
    return null;
  }
}

/**
 * Prepare data for Handlebars template
 */
async function prepareTemplateData(
  worksheet: any,
  labConfig: any,
  generatedBy: string,
  translations: Record<string, string>
): Promise<AnnexXIIIData> {
  const now = new Date();
  const retentionUntil = new Date();
  retentionUntil.setFullYear(retentionUntil.getFullYear() + 10);

  // Convert logo to base64 if it exists
  let logoBase64: string | null = null;
  if (labConfig.logoPath) {
    console.log(`[Annex XIII] Lab config has logoPath: ${labConfig.logoPath}`);
    logoBase64 = await imageToBase64(labConfig.logoPath);
    if (!logoBase64) {
      console.warn('[Annex XIII] ⚠️ Logo conversion failed, logo will not appear in PDF');
    } else {
      console.log('[Annex XIII] ✅ Logo ready for PDF embedding');
    }
  } else {
    console.log('[Annex XIII] ⚠️ No logoPath configured in lab settings');
  }

  // Convert signature to base64 if it exists
  let signatureBase64: string | null = null;
  if (labConfig.signaturePath) {
    console.log(`[Annex XIII] Lab config has signaturePath: ${labConfig.signaturePath}`);
    signatureBase64 = await imageToBase64(labConfig.signaturePath);
    if (!signatureBase64) {
      console.warn('[Annex XIII] ⚠️ Signature conversion failed, signature will not appear in PDF');
    } else {
      console.log('[Annex XIII] ✅ Signature ready for PDF embedding');
    }
  } else {
    console.log('[Annex XIII] ⚠️ No signaturePath configured in lab settings');
  }

  // Collect all materials from both sources
  const allMaterials: any[] = [];

  // Materials from products
  for (const product of worksheet.products) {
    for (const productMaterial of product.productMaterials) {
      allMaterials.push({
        code: productMaterial.material.code,
        name: productMaterial.material.name,
        manufacturer: productMaterial.material.manufacturer,
        lotNumber: productMaterial.materialLot?.lotNumber || null,
        expiryDate: productMaterial.materialLot?.expiryDate
          ? formatDate(productMaterial.materialLot.expiryDate)
          : null,
        quantityUsed: productMaterial.quantityUsed.toString(),
        unit: productMaterial.material.unit,
        toothNumber: productMaterial.toothNumber || null,
        ceMarking: productMaterial.material.ceMarking,
        biocompatible: productMaterial.material.biocompatible,
        productName: product.product.name, // Add product reference
      });
    }
  }

  // Direct worksheet materials
  for (const worksheetMaterial of worksheet.materials) {
    allMaterials.push({
      code: worksheetMaterial.material.code,
      name: worksheetMaterial.material.name,
      manufacturer: worksheetMaterial.material.manufacturer,
      lotNumber: worksheetMaterial.materialLot?.lotNumber || null,
      expiryDate: worksheetMaterial.materialLot?.expiryDate
        ? formatDate(worksheetMaterial.materialLot.expiryDate)
        : null,
      quantityUsed: worksheetMaterial.quantityUsed.toString(),
      unit: worksheetMaterial.material.unit,
      toothNumber: null,
      ceMarking: worksheetMaterial.material.ceMarking,
      biocompatible: worksheetMaterial.material.biocompatible,
      productName: 'General', // Direct materials not tied to specific product
    });
  }

  // Products summary
  const products = worksheet.products.map((p: any) => ({
    code: p.product.code,
    name: p.product.name,
    quantity: p.quantity,
    teeth: worksheet.teeth.map((t: any) => t.toothNumber).join(', ') || 'N/A',
  }));

  // Translate QC result
  const translateResult = (result: string): string => {
    const resultKey = `qcResult${result.charAt(0).toUpperCase()}${result.slice(1).toLowerCase()}`;
    return translations[resultKey] || result;
  };

  // QC inspection data (including new EU MDR fields)
  const qcInspection = worksheet.qualityControls[0]
    ? {
        inspectorName: labConfig.responsiblePersonName,  // Use Annex XIII responsible person from lab config
        inspectionDate: formatDateLocalized(worksheet.qualityControls[0].inspectionDate, translations),
        result: worksheet.qualityControls[0].result,
        resultTranslated: translateResult(worksheet.qualityControls[0].result),
        notes: worksheet.qualityControls[0].notes,
        // EU MDR Annex XIII Compliance Fields
        emdnCode: worksheet.qualityControls[0].emdnCode || 'Q010206 - Dental Prostheses',
        riskClass: worksheet.qualityControls[0].riskClass || 'Class IIa',
        annexIDeviations: worksheet.qualityControls[0].annexIDeviations || null,
        documentVersion: worksheet.qualityControls[0].documentVersion || '1.0',
      }
    : undefined;

  // Format dates with locale awareness
  const generationDateFormatted = formatDateLocalized(now, translations);
  const retentionUntilFormatted = formatDateLocalized(retentionUntil, translations);

  // Process translations with placeholders
  const processedTranslations = { ...translations };
  if (processedTranslations.declarationIntro) {
    processedTranslations.declarationIntro = replacePlaceholders(
      processedTranslations.declarationIntro,
      { laboratoryName: labConfig.laboratoryName }
    );
  }
  if (processedTranslations.retentionNotice) {
    processedTranslations.retentionNotice = replacePlaceholders(
      processedTranslations.retentionNotice,
      { retentionUntil: retentionUntilFormatted }
    );
  }
  if (processedTranslations.generatedBy) {
    processedTranslations.generatedBy = replacePlaceholders(
      processedTranslations.generatedBy,
      { generatedBy }
    );
  }

  return {
    documentId: `MDR-${worksheet.worksheetNumber}`,
    worksheetNumber: worksheet.worksheetNumber,
    generationDate: generationDateFormatted,
    retentionUntil: retentionUntilFormatted,
    generatedBy,

    lab: {
      laboratoryName: labConfig.laboratoryName,
      laboratoryId: labConfig.laboratoryId,
      laboratoryLicense: labConfig.laboratoryLicense,
      registrationNumber: labConfig.registrationNumber,
      taxId: labConfig.taxId,
      street: labConfig.street,
      city: labConfig.city,
      postalCode: labConfig.postalCode,
      country: labConfig.country || 'Slovenia',
      phone: labConfig.phone,
      email: labConfig.email,
      website: labConfig.website,
      logoPath: logoBase64, // Use base64 data URI instead of file path
      signaturePath: signatureBase64, // Use base64 data URI for signature
      bankAccount: labConfig.bankAccount,
      bankSwift: labConfig.bankSwift,
      responsiblePersonName: labConfig.responsiblePersonName,
      responsiblePersonTitle: labConfig.responsiblePersonTitle,
      responsiblePersonLicense: labConfig.responsiblePersonLicense,
      responsiblePersonEmail: labConfig.responsiblePersonEmail,
      responsiblePersonPhone: labConfig.responsiblePersonPhone,
    },

    deviceDescription: worksheet.deviceDescription || 'Custom-made dental device',
    intendedUse: worksheet.intendedUse || 'Dental restoration',
    manufactureDate: worksheet.manufactureDate
      ? formatDateLocalized(worksheet.manufactureDate, translations)
      : generationDateFormatted,
    deliveryDate: worksheet.deliveryDate ? formatDateLocalized(worksheet.deliveryDate, translations) : null,
    patientName: worksheet.patientName || 'Confidential',
    // Extract just the numeric part of order number (e.g., "26001" from "Order #26001" or just "26001")
    orderNumber: worksheet.order.orderNumber.replace(/[^0-9]/g, ''),

    dentist: {
      name: worksheet.order.dentist.dentistName,
      licenseNumber: worksheet.order.dentist.licenseNumber,
      clinicName: worksheet.order.dentist.clinicName,
      address: worksheet.order.dentist.address,
      city: worksheet.order.dentist.city,
      postalCode: worksheet.order.dentist.postalCode,
      email: worksheet.order.dentist.email,
      phone: worksheet.order.dentist.phone,
    },

    products,
    materials: allMaterials,
    qcInspection,
    t: processedTranslations,
  };
}

/**
 * Compile Handlebars template with data
 */
async function compileTemplate(data: AnnexXIIIData): Promise<string> {
  try {
    // Register Handlebars helpers
    handlebars.registerHelper('eq', function (a: any, b: any) {
      return a === b;
    });

    handlebars.registerHelper('hasGeneralMaterials', function (materials: any[]) {
      return materials.some((m) => m.productName === 'General');
    });

    const templatePath = path.join(process.cwd(), 'lib', 'pdf', 'templates', 'annex-xiii.hbs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const template = handlebars.compile(templateContent);
    return template(data);
  } catch (error) {
    console.error('[Annex XIII] Template compilation failed:', error);
    throw new Error('Failed to compile Annex XIII template');
  }
}

/**
 * Generate PDF from HTML using Puppeteer
 */
async function generatePDF(html: string): Promise<Buffer> {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const pdfResult = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    // Convert Uint8Array to Buffer for compatibility
    return Buffer.from(pdfResult);
  } catch (error) {
    console.error('[Annex XIII] PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Save PDF to database and disk
 */
async function saveDocument(
  worksheetId: string,
  pdfBuffer: Buffer,
  userId: string
): Promise<PrismaDocument> {
  const fs = require('fs').promises;
  const path = require('path');

  // Get worksheet to build document number
  const worksheet = await prisma.workSheet.findUnique({
    where: { id: worksheetId },
    select: { worksheetNumber: true },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  // Generate MDR-compliant document number tied to worksheet (e.g., MDR-DN-25001)
  // Format: MDR-{WorksheetNumber} for direct traceability per EU MDR Article 10
  const documentNumber = `MDR-${worksheet.worksheetNumber}`;

  // Check if document already exists by documentNumber (handles voided worksheet scenario)
  const existingDocument = await prisma.document.findUnique({
    where: {
      documentNumber: documentNumber,
    },
  });

  // Create documents directory if it doesn't exist
  const documentsDir = path.join(process.cwd(), 'documents', 'annex-xiii');
  await fs.mkdir(documentsDir, { recursive: true });

  // Generate filename and path
  const fileName = `${documentNumber}.pdf`;
  const filePath = path.join(documentsDir, fileName);

  // Save PDF to disk (overwrites if exists)
  await fs.writeFile(filePath, pdfBuffer);

  // Calculate dates
  const now = new Date();
  const retentionUntil = new Date();
  retentionUntil.setFullYear(retentionUntil.getFullYear() + 10);

  // If document exists, update it (regeneration or voided worksheet scenario)
  if (existingDocument) {
    console.log(`[Annex XIII] Document already exists (${existingDocument.id}), updating with new worksheet data`);

    return await prisma.document.update({
      where: { id: existingDocument.id },
      data: {
        worksheetId,  // Update to new worksheet (important for voided worksheet scenario)
        fileName,
        filePath,
        fileSize: pdfBuffer.length,
        generatedAt: now,
        retentionUntil,
        generatedBy: userId,
      },
    });
  }

  // Create new document record
  return await prisma.document.create({
    data: {
      worksheetId,
      type: 'ANNEX_XIII' as DocumentType,
      documentNumber,
      fileName,
      filePath,
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
      generatedAt: now,
      retentionUntil,
      generatedBy: userId,
    },
  });
}

/**
 * Format date for display (English format)
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date for display with locale awareness
 * Uses Slovenian format (dd. MMMM yyyy) when translations indicate sl locale
 */
function formatDateLocalized(date: Date, translations: Record<string, string>): string {
  // Check if we're in Slovenian locale by checking a translation key
  const isSlovenian = translations.documentTitle?.includes('PRILOGA') || false;

  return new Intl.DateTimeFormat(isSlovenian ? 'sl-SI' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Replace placeholders in translation strings
 */
function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { AnnexXIIIData };
