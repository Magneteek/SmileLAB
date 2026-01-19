/**
 * Reusable PDF Footer Component
 *
 * Generates consistent footers for ALL PDF documents
 * Uses brand styling from pdf-styles.ts
 */

import { PDF_BRAND_COLORS, PDF_FONTS } from './pdf-styles';
import { format } from 'date-fns';

export interface PDFFooterConfig {
  /** Laboratory/company name */
  laboratoryName: string;
  /** City (e.g., "Ljubljana") */
  city: string;
  /** Country (e.g., "Slovenia") */
  country: string;
  /** Document code (optional, e.g., "SOP-001 v2.1") */
  documentCode?: string;
  /** Show page numbers (default: true) */
  showPageNumbers?: boolean;
  /** Show generation date (default: true) */
  showDate?: boolean;
  /** Custom footer text (optional, replaces default copyright) */
  customText?: string;
  /** Footer alignment: 'left' | 'center' | 'right' (default: 'center') */
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Generate PDF footer HTML
 *
 * This function creates a professional footer with:
 * - Copyright notice with company info
 * - Page numbers (Page X of Y)
 * - Generation date
 * - Consistent brand styling
 *
 * Works with Puppeteer's displayHeaderFooter option
 *
 * @param config - Footer configuration
 * @returns HTML string for Puppeteer footer
 */
export function generatePDFFooter(config: PDFFooterConfig): string {
  const {
    laboratoryName,
    city,
    country,
    documentCode,
    showPageNumbers = true,
    showDate = true,
    customText,
    alignment = 'center',
  } = config;

  const currentYear = new Date().getFullYear();
  const generationDate = format(new Date(), 'MMM dd, yyyy');

  // Left section: Copyright or custom text
  const leftSection = customText
    ? customText
    : `© ${currentYear} ${laboratoryName}. ${city}, ${country}`;

  // Center section: Document code (if provided)
  const centerSection = documentCode ? documentCode : '';

  // Right section: Page numbers and/or date
  let rightSection = '';
  if (showPageNumbers && showDate) {
    rightSection = `Page <span class="pageNumber"></span> of <span class="totalPages"></span> | ${generationDate}`;
  } else if (showPageNumbers) {
    rightSection = `Page <span class="pageNumber"></span> of <span class="totalPages"></span>`;
  } else if (showDate) {
    rightSection = generationDate;
  }

  // For center-aligned footer
  if (alignment === 'center') {
    return `
      <div style="
        width: 100%;
        font-size: ${PDF_FONTS.sizes.tiny};
        padding: 5mm 15mm 0 15mm;
        color: ${PDF_BRAND_COLORS.muted};
        font-family: ${PDF_FONTS.family};
        text-align: center;
        border-top: 0.5pt solid ${PDF_BRAND_COLORS.borderLight};
      ">
        <div>${leftSection}</div>
        ${rightSection ? `<div style="margin-top: 2px;">${rightSection}</div>` : ''}
      </div>
    `;
  }

  // For left/right split footer (default)
  return `
    <div style="
      width: 100%;
      font-size: ${PDF_FONTS.sizes.tiny};
      padding: 5mm 15mm 0 15mm;
      color: ${PDF_BRAND_COLORS.muted};
      font-family: ${PDF_FONTS.family};
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 0.5pt solid ${PDF_BRAND_COLORS.borderLight};
    ">
      <span style="flex: 1; text-align: left;">${leftSection}</span>
      ${centerSection ? `<span style="flex: 1; text-align: center;">${centerSection}</span>` : ''}
      <span style="flex: 1; text-align: right;">${rightSection}</span>
    </div>
  `;
}

/**
 * Generate simplified footer
 *
 * Minimal footer with just page numbers
 *
 * @param config - Footer configuration
 * @returns HTML string for Puppeteer footer
 */
export function generateSimplePDFFooter(config: PDFFooterConfig): string {
  const { showPageNumbers = true } = config;

  if (!showPageNumbers) {
    return '';
  }

  return `
    <div style="
      width: 100%;
      font-size: ${PDF_FONTS.sizes.tiny};
      padding: 5mm 15mm 0 15mm;
      color: ${PDF_BRAND_COLORS.muted};
      font-family: ${PDF_FONTS.family};
      text-align: center;
      border-top: 0.5pt solid ${PDF_BRAND_COLORS.borderLight};
    ">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `;
}

/**
 * Generate footer for compliance documents (Annex XIII)
 *
 * Special footer variant for regulatory documents with retention notice
 *
 * @param config - Footer configuration
 * @param retentionUntil - Date until document must be retained (10 years for MDR)
 * @returns HTML string for Puppeteer footer
 */
export function generateComplianceFooter(
  config: PDFFooterConfig,
  retentionUntil?: Date
): string {
  const { laboratoryName, city, country, showPageNumbers = true } = config;

  const currentYear = new Date().getFullYear();
  const generationDate = format(new Date(), 'MMM dd, yyyy');

  // Retention notice (if retention date provided)
  const retentionNotice = retentionUntil
    ? `<div style="
        font-size: ${PDF_FONTS.sizes.tiny};
        color: ${PDF_BRAND_COLORS.danger.text};
        font-weight: ${PDF_FONTS.weights.semibold};
        margin-bottom: 2mm;
      ">
        ⚠ RETAIN UNTIL: ${format(retentionUntil, 'MMM dd, yyyy')} (EU MDR Requirement)
      </div>`
    : '';

  const pageNumbers = showPageNumbers
    ? `Page <span class="pageNumber"></span> of <span class="totalPages"></span>`
    : '';

  return `
    <div style="
      width: 100%;
      padding: 5mm 15mm 0 15mm;
      font-family: ${PDF_FONTS.family};
      border-top: 2px solid ${PDF_BRAND_COLORS.blue};
    ">
      ${retentionNotice}
      <div style="
        display: flex;
        justify-content: space-between;
        font-size: ${PDF_FONTS.sizes.tiny};
        color: ${PDF_BRAND_COLORS.muted};
      ">
        <span>© ${currentYear} ${laboratoryName}, ${city}, ${country}</span>
        <span>${pageNumbers}</span>
        <span>${generationDate}</span>
      </div>
    </div>
  `;
}

/**
 * Generate footer for invoices
 *
 * Invoice-specific footer with payment terms notice
 *
 * @param config - Footer configuration
 * @param paymentTerms - Payment terms text (e.g., "Payment due within 30 days")
 * @returns HTML string for Puppeteer footer
 */
export function generateInvoiceFooter(
  config: PDFFooterConfig,
  paymentTerms?: string
): string {
  const { laboratoryName, city, country, showPageNumbers = true } = config;

  const generationDate = format(new Date(), 'MMM dd, yyyy');
  const defaultPaymentTerms = 'Payment due upon receipt';

  return `
    <div style="
      width: 100%;
      padding: 5mm 15mm 0 15mm;
      font-family: ${PDF_FONTS.family};
      border-top: 1px solid ${PDF_BRAND_COLORS.border};
    ">
      <div style="
        font-size: ${PDF_FONTS.sizes.tiny};
        color: ${PDF_BRAND_COLORS.secondary};
        font-weight: ${PDF_FONTS.weights.semibold};
        margin-bottom: 2mm;
        text-align: center;
      ">
        ${paymentTerms || defaultPaymentTerms}
      </div>
      <div style="
        display: flex;
        justify-content: space-between;
        font-size: ${PDF_FONTS.sizes.tiny};
        color: ${PDF_BRAND_COLORS.muted};
      ">
        <span>${laboratoryName} | ${city}, ${country}</span>
        ${showPageNumbers ? `<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>` : '<span></span>'}
        <span>${generationDate}</span>
      </div>
    </div>
  `;
}
