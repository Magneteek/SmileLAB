/**
 * Worksheet PDF Generator
 *
 * Generates printable worksheet with FDI teeth diagram
 * for technicians to use during production
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// ============================================================================
// INTERFACES
// ============================================================================

interface WorksheetPDFData {
  locale: string;
  worksheetNumber: string;
  worksheetUrl: string;
  qrCodeDataUrl: string;
  status: string;
  statusClass: string;
  createdDate: string;
  dueDate: string;
  priorityLabel: string;
  generatedDate: string;
  deviceDescription?: string;
  intendedUse?: string;
  technicalNotes?: string;

  // Lab information
  lab: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website?: string | null;
    logoPath?: string | null;
    taxId?: string | null;
    laboratoryId?: string | null;
  };

  // Technician/Manufacturer information
  technician: {
    name: string;
    idNumber?: string | null;
  };

  // Order information
  order: {
    orderNumber: string;
    orderDate: string;
    patientName: string;
    impressionType: string;
    notes?: string;
  };

  // Dentist information
  dentist: {
    clinicName: string;
    dentistName: string;
    email: string;
    phone: string;
  };

  // FDI Teeth Data
  upperRight: ToothData[];
  upperLeft: ToothData[];
  lowerRight: ToothData[];
  lowerLeft: ToothData[];
  selectedTeethDetails: Array<{
    toothNumber: string;
    workType: string;
    shade?: string;
  }>;

  // Products with materials
  products: Array<{
    productName: string;
    category: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    materials: Array<{
      materialName: string;
      manufacturer: string;
      lotNumber: string;
      quantityUsed: string;
      unit: string;
      toothNumber?: string;
      notes?: string;
    }>;
  }>;

  // Materials
  materials: Array<{
    materialName: string;
    manufacturer: string;
    lotNumber: string;
    quantity: string;
    unit: string;
    expiryDate: string;
  }>;

  // Quality Control (if available)
  qualityControl?: {
    inspector: string;
    inspectionDate: string;
    result: string;
    approved: boolean;
    rejected: boolean;
    aesthetics: boolean;
    fit: boolean;
    occlusion: boolean;
    shade: boolean;
    margins: boolean;
    notes?: string;
    actionRequired?: string;
  };

  // Translations
  t: Record<string, string>;
}

interface ToothData {
  number: string;
  selected: boolean;
  workType?: string;
  shade?: string;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate printable worksheet PDF
 */
export async function generateWorksheetPDF(
  worksheetId: string,
  locale: string = 'en'
): Promise<Buffer> {
  try {
    console.log(`[Worksheet PDF] Starting generation for worksheet ${worksheetId}`);

    // Fetch lab configuration
    const labConfig = await getLabConfigurationOrThrow();
    console.log(`[Worksheet PDF] Lab configuration loaded: ${labConfig.laboratoryName}`);

    // Fetch worksheet with all relations
    const worksheet = await fetchWorksheetData(worksheetId);
    console.log(`[Worksheet PDF] Worksheet data loaded: ${worksheet.worksheetNumber}`);

    // Load translations
    const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
    const messagesContent = await fs.readFile(messagesPath, 'utf-8');
    const messages = JSON.parse(messagesContent);
    const translations = messages.worksheetPdf || {};
    console.log(`[Worksheet PDF] Translations loaded for locale: ${locale}`);

    // Prepare template data
    const data = await prepareTemplateData(worksheet, labConfig, translations, locale);
    console.log(`[Worksheet PDF] Template data prepared`);

    // Compile Handlebars template
    const html = await compileTemplate(data);
    console.log(`[Worksheet PDF] Template compiled successfully`);

    // Generate PDF using Puppeteer
    const pdfBuffer = await generatePDF(html);
    console.log(`[Worksheet PDF] PDF generated: ${pdfBuffer.length} bytes`);

    return pdfBuffer;
  } catch (error) {
    console.error('[Worksheet PDF] Generation failed:', error);
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
      dentist: true,
      teeth: true,
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
      qualityControls: {
        include: {
          inspector: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  return worksheet;
}

/**
 * Convert image file to base64 data URI for PDF embedding
 */
async function imageToBase64(filePath: string): Promise<string | null> {
  try {
    console.log(`[Worksheet PDF] Converting image to base64: ${filePath}`);

    // Convert public URL path to filesystem path
    let absolutePath: string;
    if (filePath.startsWith('/')) {
      // Remove leading slash and prepend 'public/'
      absolutePath = path.join(process.cwd(), 'public', filePath.slice(1));
    } else {
      absolutePath = path.join(process.cwd(), filePath);
    }

    console.log(`[Worksheet PDF] Reading image from: ${absolutePath}`);
    const imageBuffer = await fs.readFile(absolutePath);
    const base64 = imageBuffer.toString('base64');

    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' :
                     ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.svg' ? 'image/svg+xml' : 'image/png';

    const dataUri = `data:${mimeType};base64,${base64}`;
    console.log(`[Worksheet PDF] ✅ Image converted successfully (${(base64.length / 1024).toFixed(2)} KB, ${mimeType})`);

    return dataUri;
  } catch (error) {
    console.error('[Worksheet PDF] ❌ Failed to convert image to base64:', error);
    return null;
  }
}

/**
 * Generate QR code for worksheet URL
 */
async function generateQRCode(url: string): Promise<string> {
  try {
    console.log(`[Worksheet PDF] Generating QR code for URL: ${url}`);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1,
    });

    console.log(`[Worksheet PDF] ✅ QR code generated successfully`);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('[Worksheet PDF] ❌ Failed to generate QR code:', error);
    // Return empty string if QR code generation fails
    return '';
  }
}

/**
 * Prepare data for Handlebars template
 */
async function prepareTemplateData(
  worksheet: any,
  labConfig: any,
  translations: Record<string, string>,
  locale: string
): Promise<WorksheetPDFData> {
  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Status class mapping
  const statusClassMap: Record<string, string> = {
    DRAFT: 'draft',
    IN_PRODUCTION: 'production',
    QC_PENDING: 'qc',
    QC_APPROVED: 'approved',
    QC_REJECTED: 'production',
    INVOICED: 'approved',
    DELIVERED: 'delivered',
    VOIDED: 'draft',
    CANCELLED: 'draft',
  };

  // Priority labels
  const priorityLabels = [
    translations.priorityNormal || 'Normal',
    translations.priorityHigh || 'High',
    translations.priorityUrgent || 'Urgent',
  ];

  // Convert logo to base64 if it exists
  let logoBase64: string | null = null;
  if (labConfig.logoPath) {
    console.log(`[Worksheet PDF] Lab config has logoPath: ${labConfig.logoPath}`);
    logoBase64 = await imageToBase64(labConfig.logoPath);
    if (!logoBase64) {
      console.warn('[Worksheet PDF] ⚠️ Logo conversion failed, logo will not appear in PDF');
    } else {
      console.log('[Worksheet PDF] ✅ Logo ready for PDF embedding');
    }
  } else {
    console.log('[Worksheet PDF] ⚠️ No logoPath configured in lab settings');
  }

  // Generate QR code for worksheet URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const worksheetUrl = `${baseUrl}/worksheets/${worksheet.id}`;
  const qrCodeDataUrl = await generateQRCode(worksheetUrl);
  console.log(`[Worksheet PDF] Worksheet URL: ${worksheetUrl}`);

  // Prepare FDI teeth data
  const teethData = prepareTeethData(worksheet.teeth, translations);

  // Prepare products data with materials
  const productsData = worksheet.products.map((wp: any) => {
    const unitPrice = wp.unitPrice ? parseFloat(wp.unitPrice.toString()) : 0;
    const quantity = wp.quantity || 0;

    // Map materials for this product
    const productMaterials = (wp.productMaterials || []).map((wpm: any) => ({
      materialName: wpm.material.name,
      manufacturer: wpm.material.manufacturer || '-',
      lotNumber: wpm.materialLot?.lotNumber || '-',
      quantityUsed: wpm.quantityUsed ? wpm.quantityUsed.toString() : '0',
      unit: wpm.material.unit || 'g',
      toothNumber: wpm.toothNumber || undefined,
      notes: wpm.notes || undefined,
    }));

    return {
      productName: wp.product.name,
      category: wp.product.category,
      quantity: quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: (quantity * unitPrice).toFixed(2),
      materials: productMaterials,
    };
  });

  // Prepare materials data
  const materialsData = worksheet.materials.map((wm: any) => ({
    materialName: wm.material.name,
    manufacturer: wm.material.manufacturer || '-',
    lotNumber: wm.materialLot?.lotNumber || '-',
    quantity: wm.quantityUsed ? wm.quantityUsed.toString() : '0',
    unit: wm.material.unit || 'g',
    expiryDate: wm.materialLot?.expiryDate ? formatDate(wm.materialLot.expiryDate) : '-',
  }));

  // Prepare QC data (if available) - get the most recent quality control
  let qualityControlData = undefined;
  if (worksheet.qualityControls && worksheet.qualityControls.length > 0) {
    // Get the most recent QC record (should only be one per worksheet)
    const qc = worksheet.qualityControls[0];

    // Translate QC result
    const translateResult = (result: string): string => {
      const resultKey = `qcResult${result.charAt(0).toUpperCase()}${result.slice(1).toLowerCase()}`;
      return translations[resultKey] || result;
    };

    qualityControlData = {
      // Use technician name from lab settings instead of inspector
      inspector: labConfig.responsiblePersonName,
      inspectionDate: formatDate(qc.inspectionDate),
      result: translateResult(qc.result),
      approved: qc.result === 'APPROVED' || qc.result === 'CONDITIONAL',
      rejected: qc.result === 'REJECTED',
      aesthetics: qc.aesthetics,
      fit: qc.fit,
      occlusion: qc.occlusion,
      shade: qc.shade,
      margins: qc.margins,
      notes: qc.notes,
      actionRequired: qc.actionRequired,
    };
  }

  return {
    locale,
    worksheetNumber: worksheet.worksheetNumber,
    worksheetUrl,
    qrCodeDataUrl,
    status: worksheet.status,
    statusClass: statusClassMap[worksheet.status] || 'draft',
    createdDate: formatDate(worksheet.createdAt),
    dueDate: worksheet.order.dueDate ? formatDate(worksheet.order.dueDate) : '-',
    priorityLabel: priorityLabels[worksheet.order.priority] || 'Normal',
    generatedDate: formatDate(new Date()),

    lab: {
      name: labConfig.laboratoryName,
      address: labConfig.street,
      city: labConfig.city,
      postalCode: labConfig.postalCode,
      country: labConfig.country,
      phone: labConfig.phone,
      email: labConfig.email,
      website: labConfig.website,
      logoPath: logoBase64, // Use base64 data URI instead of file path
      taxId: labConfig.taxId,
      laboratoryId: labConfig.laboratoryId,
    },

    technician: {
      name: labConfig.responsiblePersonName,
      idNumber: labConfig.technicianIdNumber || labConfig.responsiblePersonLicense,
    },

    order: {
      orderNumber: worksheet.order.orderNumber,
      orderDate: formatDate(worksheet.order.createdAt),
      patientName: worksheet.order.patientName || '-',
      impressionType: worksheet.order.impressionType === 'DIGITAL_SCAN'
        ? (translations.impressionTypeDigital || 'Digital Scan')
        : (translations.impressionTypePhysical || 'Physical Imprint'),
      notes: worksheet.order.notes || undefined,
    },

    dentist: {
      clinicName: worksheet.dentist.clinicName,
      dentistName: worksheet.dentist.dentistName,
      email: worksheet.dentist.email,
      phone: worksheet.dentist.phone,
    },

    ...teethData,

    deviceDescription: worksheet.deviceDescription || undefined,
    intendedUse: worksheet.intendedUse || undefined,
    technicalNotes: worksheet.technicalNotes || undefined,

    products: productsData,
    materials: materialsData,
    qualityControl: qualityControlData,

    t: translations,
  };
}

/**
 * Translate work type to current locale
 */
function translateWorkType(workType: string, translations: Record<string, string>): string {
  const key = `workType${workType.charAt(0).toUpperCase()}${workType.slice(1).toLowerCase()}`;
  return translations[key] || workType;
}

/**
 * Prepare FDI teeth data for all quadrants
 */
function prepareTeethData(teethRecords: any[], translations: Record<string, string>) {
  // Create a map of selected teeth with full details
  const selectedTeethMap = new Map();
  teethRecords.forEach((tooth) => {
    selectedTeethMap.set(tooth.toothNumber, {
      workType: translateWorkType(tooth.workType, translations),
      shade: tooth.shade,
    });
  });

  // Helper to create tooth data
  const createTooth = (number: number): ToothData => {
    const toothNumber = number.toString();
    const selected = selectedTeethMap.has(toothNumber);
    const toothData = selectedTeethMap.get(toothNumber);
    return {
      number: toothNumber,
      selected,
      workType: selected ? toothData.workType : undefined,
      shade: selected ? toothData.shade : undefined,
    };
  };

  // Generate selected teeth details list
  const selectedTeethDetails = teethRecords.map((tooth) => ({
    toothNumber: tooth.toothNumber,
    workType: translateWorkType(tooth.workType, translations),
    shade: tooth.shade || undefined,
  }));

  // Generate all teeth for each quadrant
  return {
    upperRight: Array.from({ length: 8 }, (_, i) => createTooth(18 - i)), // 18-11
    upperLeft: Array.from({ length: 8 }, (_, i) => createTooth(21 + i)), // 21-28
    lowerRight: Array.from({ length: 8 }, (_, i) => createTooth(48 - i)), // 48-41
    lowerLeft: Array.from({ length: 8 }, (_, i) => createTooth(31 + i)), // 31-38
    selectedTeethDetails,
  };
}

/**
 * Compile Handlebars template
 */
async function compileTemplate(data: WorksheetPDFData): Promise<string> {
  const templatePath = path.join(
    process.cwd(),
    'lib',
    'pdf',
    'templates',
    'worksheet-print.hbs'
  );

  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const template = handlebars.compile(templateContent);
  return template(data);
}

/**
 * Generate PDF from HTML using Puppeteer
 */
async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
