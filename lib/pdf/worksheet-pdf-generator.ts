/**
 * Worksheet PDF Generator
 *
 * Generates printable worksheet with FDI teeth diagram
 * for technicians to use during production
 *
 * NOW USES UNIFIED PDF INFRASTRUCTURE:
 * - Base generator from pdf-generator.ts (Puppeteer wrapper)
 * - Handlebars template with embedded styling (for now)
 * - Future: Extract template CSS to pdf-styles.ts
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import { generatePDFFromTemplate } from './base/pdf-generator';
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
  shadeIncisal?: string;
  shadeCervical?: string;
  shadeIncisalColor?: string;
  shadeCervicalColor?: string;
  hasShade?: boolean;

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
    implant: boolean;
    bgColor: string;
    patternClass: string;
  }>;
  workTypeSummary: Array<{
    workType: string;
    count: number;
    bgColor: string;
    patternClass: string;
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
  implant: boolean;
  // Pre-computed styles for template rendering
  bgColor: string;
  patternClass: string;
  borderColor: string;
  borderWidth: string;
  width: number;
  height: number;
  crownRadius: number;
  archOffset: number;
  borderRadiusUpper: string;
  borderRadiusLower: string;
  numberColor: string;
  numberWeight: string;
}

// Anatomical proportions per position (1=central incisor → 8=wisdom), scaled 1.2x for print
const TOOTH_POSITION_CONFIG: Record<number, { width: number; height: number; crownRadius: number; archOffset: number }> = {
  1: { width: 23, height: 38, crownRadius: 11, archOffset: 0  },
  2: { width: 20, height: 36, crownRadius: 10, archOffset: 4  },
  3: { width: 20, height: 41, crownRadius: 13, archOffset: 8  },
  4: { width: 24, height: 32, crownRadius:  8, archOffset: 12 },
  5: { width: 24, height: 30, crownRadius:  7, archOffset: 14 },
  6: { width: 29, height: 29, crownRadius:  6, archOffset: 17 },
  7: { width: 28, height: 28, crownRadius:  5, archOffset: 18 },
  8: { width: 25, height: 26, crownRadius:  5, archOffset: 19 },
};

// Work-type fill colours (matches TeethSelector constants)
const TOOTH_WORK_TYPE_COLORS: Record<string, string> = {
  crown:       '#3B82F6',
  bridge:      '#8B5CF6',
  veneer:      '#EC4899',
  denture:     '#EF4444',
  wizil:       '#F97316',
  inlay_onlay: '#14B8A6',
  coping:      '#78716C',
  other:       '#9CA3AF',
};

// Fill patterns per work type, layered on top of the colour so the chart still
// reads correctly when printed or photocopied in black & white (not colour alone).
const TOOTH_WORK_TYPE_PATTERNS: Record<string, string> = {
  crown:       'pat-solid',
  bridge:      'pat-diag1',
  veneer:      'pat-dots',
  denture:     'pat-horiz',
  wizil:       'pat-vert',
  inlay_onlay: 'pat-diag2',
  coping:      'pat-diagcross',
  other:       'pat-cross',
};

// Canonical display order for the deduplicated work-type summary
const WORK_TYPE_ORDER = ['crown', 'bridge', 'veneer', 'denture', 'wizil', 'inlay_onlay', 'coping', 'other'];

// VITA shade hex colors (mirrors ToothShadeReference.tsx)
const VITA_COLORS_PDF: Record<string, string> = {
  A1: '#F5E6C4', A2: '#F0D9A0', A3: '#E8CA78', 'A3.5': '#E0BE60', A4: '#D4A840',
  B1: '#F5EAD0', B2: '#EFDFB5', B3: '#E8D095', B4: '#D8BC70',
  C1: '#F0E5D5', C2: '#E6D5B8', C3: '#D8C49A', C4: '#C8B080',
  D2: '#EDD8B8', D3: '#E0C890', D4: '#CEB278',
  '0M1': '#F7EDD8', '0M2': '#F5E5C8', '0M3': '#F0DDB8',
  '1M1': '#F2E4C0', '1M2': '#EDD9A8',
  '2L1.5': '#EEDD98', '2L2.5': '#EAD490', '2M1': '#EDD89C', '2M2': '#E8CF88',
  '2M3': '#E3C870', '2R1.5': '#EAD594', '2R2.5': '#E5CD80',
  '3L1.5': '#E8CF84', '3L2.5': '#E3C870', '3M1': '#E8CC80', '3M2': '#E3C268',
  '3M3': '#DCBA58', '3R1.5': '#E5C97C', '3R2.5': '#DFC070',
  '4L1.5': '#E2C874', '4L2.5': '#DBC060', '4M1': '#E2C570', '4M2': '#DCBC5C',
  '4M3': '#D4B04A', '4R1.5': '#DEC26C', '4R2.5': '#D8B858',
  '5M1': '#DBBC60', '5M2': '#D4B24C', '5M3': '#CCA83C',
};

function getShadeHexColor(shade: string | null | undefined): string {
  if (!shade) return '#F3F4F6';
  return VITA_COLORS_PDF[shade] ?? '#F0E6D0';
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
    shadeIncisal: (worksheet as any).shadeIncisal || undefined,
    shadeCervical: (worksheet as any).shadeCervical || undefined,
    shadeIncisalColor: getShadeHexColor((worksheet as any).shadeIncisal),
    shadeCervicalColor: getShadeHexColor((worksheet as any).shadeCervical),
    hasShade: !!((worksheet as any).shadeIncisal || (worksheet as any).shadeCervical),

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
  const selectedTeethMap = new Map<string, { workType: string; workTypeKey: string; shade?: string; implant: boolean }>();
  teethRecords.forEach((tooth) => {
    selectedTeethMap.set(tooth.toothNumber, {
      workType: translateWorkType(tooth.workType, translations),
      workTypeKey: tooth.workType.toLowerCase(),
      shade: tooth.shade,
      implant: tooth.implant || false,
    });
  });

  // Helper to create tooth data with pre-computed styles
  const createTooth = (number: number): ToothData => {
    const toothNumber = number.toString();
    const selected = selectedTeethMap.has(toothNumber);
    const info = selectedTeethMap.get(toothNumber);

    const position = number % 10 || 8; // e.g. 18 → 8, 11 → 1
    const config = TOOTH_POSITION_CONFIG[position] ?? TOOTH_POSITION_CONFIG[6];

    const bgColor = selected && info
      ? (TOOTH_WORK_TYPE_COLORS[info.workTypeKey] ?? '#9CA3AF')
      : '#F3F4F6';
    const patternClass = selected && info
      ? (TOOTH_WORK_TYPE_PATTERNS[info.workTypeKey] ?? 'pat-cross')
      : 'pat-solid';
    const borderColor = selected ? 'rgba(0,0,0,0.22)' : '#E5E7EB';
    const { crownRadius } = config;

    return {
      number: toothNumber,
      selected,
      workType: selected ? info?.workType : undefined,
      shade: selected ? info?.shade : undefined,
      implant: selected ? (info?.implant ?? false) : false,
      bgColor,
      patternClass,
      borderColor,
      borderWidth: selected ? '2px' : '1.5px',
      width: config.width,
      height: config.height,
      crownRadius,
      archOffset: config.archOffset,
      borderRadiusUpper: `3px 3px ${crownRadius}px ${crownRadius}px`,
      borderRadiusLower: `${crownRadius}px ${crownRadius}px 3px 3px`,
      numberColor: selected ? '#374151' : '#9CA3AF',
      numberWeight: selected ? '600' : '400',
    };
  };

  // Generate selected teeth details list (with colour + pattern for legend)
  const selectedTeethDetails = teethRecords.map((tooth) => ({
    toothNumber: tooth.toothNumber,
    workType: translateWorkType(tooth.workType, translations),
    shade: tooth.shade || undefined,
    implant: tooth.implant || false,
    bgColor: TOOTH_WORK_TYPE_COLORS[tooth.workType.toLowerCase()] ?? '#9CA3AF',
    patternClass: TOOTH_WORK_TYPE_PATTERNS[tooth.workType.toLowerCase()] ?? 'pat-cross',
  }));

  // Deduplicated per-work-type summary (one entry per type, with a count) —
  // used for the legend and the "TIP DELA" line instead of repeating every tooth.
  const workTypeCounts = new Map<string, { workType: string; count: number; bgColor: string; patternClass: string }>();
  teethRecords.forEach((tooth) => {
    const key = tooth.workType.toLowerCase();
    const existing = workTypeCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      workTypeCounts.set(key, {
        workType: translateWorkType(tooth.workType, translations),
        count: 1,
        bgColor: TOOTH_WORK_TYPE_COLORS[key] ?? '#9CA3AF',
        patternClass: TOOTH_WORK_TYPE_PATTERNS[key] ?? 'pat-cross',
      });
    }
  });
  const workTypeSummary = WORK_TYPE_ORDER
    .filter((key) => workTypeCounts.has(key))
    .map((key) => workTypeCounts.get(key)!);

  // Generate all teeth for each quadrant
  return {
    upperRight: Array.from({ length: 8 }, (_, i) => createTooth(18 - i)), // 18→11
    upperLeft:  Array.from({ length: 8 }, (_, i) => createTooth(21 + i)), // 21→28
    lowerRight: Array.from({ length: 8 }, (_, i) => createTooth(48 - i)), // 48→41
    lowerLeft:  Array.from({ length: 8 }, (_, i) => createTooth(31 + i)), // 31→38
    selectedTeethDetails,
    workTypeSummary,
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
 * Generate PDF from HTML using unified PDF generator
 *
 * Uses the unified PDF infrastructure for consistent generation
 * Template includes its own CSS (embedded in worksheet-print.hbs)
 */
async function generatePDF(html: string): Promise<Buffer> {
  // Use unified PDF generator
  // No header/footer needed - they're embedded in the Handlebars template
  const result = await generatePDFFromTemplate(
    html,
    '', // No separate header (in template)
    '', // No separate footer (in template)
    {
      format: 'A4',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
      displayHeaderFooter: false, // Headers/footers are in the template itself
    }
  );

  return result.buffer;
}
