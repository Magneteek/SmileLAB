/**
 * Invoice PDF Generator
 *
 * Generates professional invoice PDFs for dental laboratory services
 * following Slovenian invoice requirements and EU VAT regulations
 */

import { prisma } from '@/lib/prisma';
import { getLabConfigurationOrThrow, getPrimaryBankAccount } from '@/lib/services/lab-configuration-service';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { generateEPCQRCode } from '@/lib/utils/qr-code';

// ============================================================================
// HANDLEBARS HELPERS
// ============================================================================

/**
 * Register custom Handlebars helpers for template rendering
 */
handlebars.registerHelper('eq', function (a: any, b: any) {
  return a === b;
});

handlebars.registerHelper('ne', function (a: any, b: any) {
  return a !== b;
});

handlebars.registerHelper('gt', function (a: any, b: any) {
  return a > b;
});

handlebars.registerHelper('lt', function (a: any, b: any) {
  return a < b;
});

handlebars.registerHelper('gte', function (a: any, b: any) {
  return a >= b;
});

handlebars.registerHelper('lte', function (a: any, b: any) {
  return a <= b;
});

handlebars.registerHelper('and', function (...args: any[]) {
  // Last argument is Handlebars options object, exclude it
  return args.slice(0, -1).every(Boolean);
});

handlebars.registerHelper('or', function (...args: any[]) {
  // Last argument is Handlebars options object, exclude it
  return args.slice(0, -1).some(Boolean);
});

// ============================================================================
// INTERFACES
// ============================================================================

interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  serviceDate: string;
  issuedBy: string;
  paymentReference: string;
  generatedBy: string;

  // Laboratory information
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
    bankName?: string | null;
    bankAccount?: string | null;
    bankSwift?: string | null;
    invoiceLegalTerms?: string | null;
  };

  // Dentist (customer) information
  dentist: {
    clinicName: string;
    dentistName: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    email: string;
    phone: string;
    taxNumber?: string | null;
  };

  // Line items
  lineItems: Array<{
    position: number;
    description: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    worksheetNumber?: string | null;
    notes?: string | null;
  }>;

  // Financial summary
  subtotal: string;
  discountRate: string;
  discountAmount: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;

  // Payment information
  paymentTerms: number;
  paymentStatus: string;
  notes?: string | null;
  paymentQRCode?: string | null;  // Base64 EPC QR code for payments
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate Invoice PDF for an invoice
 *
 * @param invoiceId - Invoice ID
 * @param userId - User generating the PDF
 * @returns Updated invoice record with PDF path
 */
export async function generateInvoicePDF(
  invoiceId: string,
  userId: string
): Promise<any> {
  try {
    console.log(`[Invoice PDF] Starting generation for invoice ${invoiceId}`);

    // Fetch lab configuration
    const labConfig = await getLabConfigurationOrThrow();
    console.log(`[Invoice PDF] Lab configuration loaded: ${labConfig.laboratoryName}`);

    // Fetch invoice with all relations
    const invoice = await fetchInvoiceData(invoiceId);
    console.log(`[Invoice PDF] Invoice data loaded: ${invoice.invoiceNumber}`);

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Prepare template data
    const data = await prepareTemplateData(invoice, labConfig, user.name);
    console.log(`[Invoice PDF] Template data prepared with ${data.lineItems.length} line items`);

    // Compile Handlebars template
    const html = await compileTemplate(data);
    console.log(`[Invoice PDF] Template compiled successfully`);

    // Generate PDF using Puppeteer
    const pdfBuffer = await generatePDF(html);
    console.log(`[Invoice PDF] PDF generated: ${pdfBuffer.length} bytes`);

    // Save PDF to disk and update database
    const updatedInvoice = await savePDF(invoiceId, pdfBuffer);
    console.log(`[Invoice PDF] PDF saved to database: ${updatedInvoice.pdfPath}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'InvoicePDF',
        entityId: invoiceId,
        newValues: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          pdfPath: updatedInvoice.pdfPath,
        }),
      },
    });

    console.log(`[Invoice PDF] Generation complete for ${invoice.invoiceNumber}`);
    return updatedInvoice;
  } catch (error) {
    console.error('[Invoice PDF] Generation failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch invoice with all required relations
 */
async function fetchInvoiceData(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      dentist: true,
      lineItems: {
        include: {
          worksheet: {
            select: {
              worksheetNumber: true,
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
      createdBy: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  if (!invoice.dentist) {
    throw new Error('Invoice must have an associated dentist');
  }

  if (!invoice.invoiceNumber) {
    throw new Error('Cannot generate PDF for draft invoice. Please finalize invoice first.');
  }

  return invoice;
}

/**
 * Prepare data for Handlebars template
 */
async function prepareTemplateData(
  invoice: any,
  labConfig: any,
  generatedBy: string
): Promise<InvoiceData> {
  // Get dentist payment terms (default 30 days)
  const paymentTerms = invoice.dentist.paymentTerms || 30;

  // Format line items
  const lineItems = invoice.lineItems.map((item: any, index: number) => ({
    position: item.position || index + 1,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toFixed(2),
    totalPrice: item.totalPrice.toFixed(2),
    worksheetNumber: item.worksheet?.worksheetNumber || null,
    notes: item.notes,
  }));

  // Get primary bank account for QR code
  const primaryBankAccount = await getPrimaryBankAccount();

  // Generate EPC QR Code for payment (if bank account exists)
  let paymentQRCode: string | null = null;

  if (primaryBankAccount?.iban) {
    try {
      paymentQRCode = await generateEPCQRCode({
        beneficiaryName: labConfig.laboratoryName,
        iban: primaryBankAccount.iban,
        amount: parseFloat(invoice.totalAmount.toString()),
        reference: invoice.paymentReference || invoice.invoiceNumber,
        bic: primaryBankAccount.swiftBic || undefined,
        purpose: 'Dental Laboratory Services',
      });
      console.log('[Invoice PDF] Payment QR code generated successfully');
    } catch (error) {
      console.error('[Invoice PDF] Failed to generate QR code:', error);
      // Continue without QR code if generation fails
    }
  } else {
    console.warn('[Invoice PDF] No bank account configured, skipping QR code generation');
  }

  // Convert logo to base64 data URL for Puppeteer (more reliable than file://)
  let logoPath = null;
  if (labConfig.logoPath) {
    try {
      // Remove leading slash and construct absolute path
      const relativePath = labConfig.logoPath.replace(/^\//, '');
      const absolutePath = path.join(process.cwd(), 'public', relativePath);

      // Read file and convert to base64
      const imageBuffer = await fs.readFile(absolutePath);
      const mimeType = relativePath.endsWith('.png') ? 'image/png' :
                      relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') ? 'image/jpeg' :
                      relativePath.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

      logoPath = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      console.log(`[Invoice PDF] Logo converted to base64 (${imageBuffer.length} bytes)`);
    } catch (error) {
      console.error(`[Invoice PDF] Failed to read logo file:`, error);
      console.error(`[Invoice PDF] Original logo path from config: ${labConfig.logoPath}`);
    }
  }

  // Convert signature to base64 data URL for Puppeteer
  let signaturePath = null;
  if (labConfig.signaturePath) {
    try {
      // Remove leading slash and construct absolute path
      const relativePath = labConfig.signaturePath.replace(/^\//, '');
      const absolutePath = path.join(process.cwd(), 'public', relativePath);

      // Read file and convert to base64
      const imageBuffer = await fs.readFile(absolutePath);
      const mimeType = relativePath.endsWith('.png') ? 'image/png' :
                      relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') ? 'image/jpeg' :
                      relativePath.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

      signaturePath = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      console.log(`[Invoice PDF] Signature converted to base64 (${imageBuffer.length} bytes)`);
    } catch (error) {
      console.error(`[Invoice PDF] Failed to read signature file:`, error);
      console.error(`[Invoice PDF] Original signature path from config: ${labConfig.signaturePath}`);
    }
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : formatDate(
      new Date(invoice.invoiceDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000)
    ),
    serviceDate: formatDate(invoice.serviceDate || invoice.invoiceDate),
    issuedBy: invoice.issuedBy || 'Rommy Balzan Verbič',
    paymentReference: invoice.paymentReference || invoice.invoiceNumber,
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
      logoPath: logoPath,
      signaturePath: signaturePath,
      bankName: primaryBankAccount?.bankName || null,
      bankAccount: primaryBankAccount?.iban || null,
      bankSwift: primaryBankAccount?.swiftBic || null,
      invoiceLegalTerms: labConfig.invoiceLegalTerms || null,
    },

    dentist: {
      clinicName: invoice.dentist.clinicName,
      dentistName: invoice.dentist.dentistName,
      address: invoice.dentist.address,
      city: invoice.dentist.city,
      postalCode: invoice.dentist.postalCode,
      email: invoice.dentist.email,
      phone: invoice.dentist.phone,
      taxNumber: invoice.dentist.taxNumber,
    },

    lineItems,

    subtotal: invoice.subtotal.toFixed(2),
    discountRate: invoice.discountRate?.toFixed(2) || '0.00',
    discountAmount: invoice.discountAmount?.toFixed(2) || '0.00',
    taxRate: invoice.taxRate.toFixed(2),
    taxAmount: invoice.taxAmount.toFixed(2),
    totalAmount: invoice.totalAmount.toFixed(2),

    paymentTerms,
    paymentStatus: invoice.paymentStatus,
    notes: invoice.notes,
    paymentQRCode,
  };
}

/**
 * Compile Handlebars template with data
 */
async function compileTemplate(data: InvoiceData): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), 'lib', 'pdf', 'templates', 'invoice.hbs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    const template = handlebars.compile(templateContent);
    return template(data);
  } catch (error) {
    console.error('[Invoice PDF] Template compilation failed:', error);
    throw new Error('Failed to compile invoice template');
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

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    // Convert Uint8Array to Buffer for compatibility
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[Invoice PDF] PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Save PDF to disk and update database
 */
async function savePDF(
  invoiceId: string,
  pdfBuffer: Buffer
): Promise<any> {
  const fs = require('fs').promises;
  const path = require('path');

  // Get invoice to build filename
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { invoiceNumber: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Create invoices directory if it doesn't exist
  const invoicesDir = path.join(process.cwd(), 'documents', 'invoices');
  await fs.mkdir(invoicesDir, { recursive: true });

  // Generate filename and path
  const fileName = `${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  // Save PDF to disk
  await fs.writeFile(filePath, pdfBuffer);

  // Update invoice record with PDF path
  return await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      pdfPath: filePath,
      updatedAt: new Date(),
    },
  });
}

/**
 * Format date for display (Slovenian format: DD. MM. YYYY)
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { InvoiceData };
