/**
 * Base PDF Generator Engine
 *
 * Unified Puppeteer wrapper for ALL PDF generation
 * Handles browser lifecycle, styling, and configuration
 */

import puppeteer from 'puppeteer';
import { generatePDFCSS } from './pdf-styles';

export interface PDFGeneratorConfig {
  /** HTML content to render (WITHOUT <html>, <head>, <body> tags) */
  htmlContent: string;

  /** Header HTML (from pdf-header.ts functions) */
  headerHTML?: string;

  /** Footer HTML (from pdf-footer.ts functions) */
  footerHTML?: string;

  /** Page format (default: A4) */
  format?: 'A4' | 'Letter' | 'Legal';

  /** Page orientation (default: portrait) */
  orientation?: 'portrait' | 'landscape';

  /** Page margins (default: 25mm top, 15mm sides, 20mm bottom) */
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };

  /** Additional CSS to inject (optional, for document-specific styles) */
  customCSS?: string;

  /** Print background graphics (default: true) */
  printBackground?: boolean;

  /** Display header and footer (default: true if header/footer provided) */
  displayHeaderFooter?: boolean;

  /** Page scale (default: 1.0) */
  scale?: number;

  /** Prefer CSS page size (default: false) */
  preferCSSPageSize?: boolean;
}

export interface PDFGeneratorResult {
  /** Generated PDF as Buffer */
  buffer: Buffer;

  /** Generation timestamp */
  generatedAt: Date;

  /** Estimated file size in KB */
  sizeKB: number;
}

/**
 * Generate PDF from HTML content
 *
 * This is the SINGLE SOURCE for all PDF generation in the system.
 * All PDF generators should use this function.
 *
 * @param config - PDF generation configuration
 * @returns Promise with PDF buffer and metadata
 *
 * @example
 * ```typescript
 * const result = await generatePDF({
 *   htmlContent: '<h1>My Document</h1><p>Content here</p>',
 *   headerHTML: generatePDFHeader({ ... }),
 *   footerHTML: generatePDFFooter({ ... }),
 * });
 * ```
 */
export async function generatePDF(
  config: PDFGeneratorConfig
): Promise<PDFGeneratorResult> {
  const {
    htmlContent,
    headerHTML = '',
    footerHTML = '',
    format = 'A4',
    orientation = 'portrait',
    margins = {},
    customCSS = '',
    printBackground = true,
    displayHeaderFooter,
    scale = 1.0,
    preferCSSPageSize = false,
  } = config;

  // Generate complete HTML document
  const fullHTML = generateCompleteHTML(htmlContent, customCSS);

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Overcome limited resource problems
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set content and wait for network to be idle
    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0',
      timeout: 30000, // 30 seconds timeout
    });

    // PDF generation options
    const pdfOptions: any = {
      format,
      landscape: orientation === 'landscape',
      printBackground,
      scale,
      preferCSSPageSize,
      margin: {
        top: margins.top || '25mm',
        right: margins.right || '15mm',
        bottom: margins.bottom || '20mm',
        left: margins.left || '15mm',
      },
    };

    // Add header/footer if provided
    const shouldDisplayHeaderFooter =
      displayHeaderFooter !== undefined
        ? displayHeaderFooter
        : !!(headerHTML || footerHTML);

    if (shouldDisplayHeaderFooter) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = headerHTML || '<div></div>';
      pdfOptions.footerTemplate = footerHTML || '<div></div>';
    }

    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);

    // Calculate size
    const sizeKB = Math.round(Buffer.byteLength(pdfBuffer) / 1024);

    return {
      buffer: Buffer.from(pdfBuffer),
      generatedAt: new Date(),
      sizeKB,
    };
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    await browser.close();
  }
}

/**
 * Generate complete HTML document with CSS
 *
 * Wraps user content in proper HTML structure with global styles
 *
 * @param content - HTML content body
 * @param customCSS - Additional CSS (optional)
 * @returns Complete HTML document
 */
function generateCompleteHTML(content: string, customCSS: string = ''): string {
  const globalCSS = generatePDFCSS();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated PDF</title>
  <style>
    ${globalCSS}

    /* Custom Document-Specific Styles */
    ${customCSS}
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `.trim();
}

/**
 * Generate PDF with Handlebars template
 *
 * Helper function for template-based PDF generation
 * (used by Annex XIII, invoices, etc.)
 *
 * @param templateHTML - Compiled Handlebars HTML
 * @param headerHTML - Header HTML
 * @param footerHTML - Footer HTML
 * @param options - Additional PDF options
 * @returns Promise with PDF buffer and metadata
 */
export async function generatePDFFromTemplate(
  templateHTML: string,
  headerHTML: string,
  footerHTML: string,
  options: Partial<PDFGeneratorConfig> = {}
): Promise<PDFGeneratorResult> {
  return generatePDF({
    htmlContent: templateHTML,
    headerHTML,
    footerHTML,
    ...options,
  });
}

/**
 * Batch PDF generation
 *
 * Generate multiple PDFs in parallel
 * Useful for reports, batch invoices, etc.
 *
 * @param configs - Array of PDF configurations
 * @returns Promise with array of results
 */
export async function generatePDFBatch(
  configs: PDFGeneratorConfig[]
): Promise<PDFGeneratorResult[]> {
  const results = await Promise.all(configs.map((config) => generatePDF(config)));
  return results;
}

/**
 * Save PDF to file system
 *
 * Helper function to save generated PDF to disk
 *
 * @param buffer - PDF buffer
 * @param filepath - Output file path
 * @returns Promise<void>
 */
export async function savePDFToFile(
  buffer: Buffer,
  filepath: string
): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filepath, buffer);
}

/**
 * Convert PDF to base64 string
 *
 * Useful for email attachments
 *
 * @param buffer - PDF buffer
 * @returns Base64 encoded string
 */
export function pdfToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Estimate PDF generation time
 *
 * Helper to estimate how long PDF will take to generate
 * Based on content complexity
 *
 * @param htmlContent - HTML content to analyze
 * @returns Estimated time in milliseconds
 */
export function estimatePDFGenerationTime(htmlContent: string): number {
  const baseTime = 1000; // 1 second base
  const lengthFactor = Math.min(htmlContent.length / 10000, 5); // Max 5 seconds for length
  const tableCount = (htmlContent.match(/<table/g) || []).length;
  const tableFactor = tableCount * 200; // 200ms per table

  return baseTime + lengthFactor * 1000 + tableFactor;
}
