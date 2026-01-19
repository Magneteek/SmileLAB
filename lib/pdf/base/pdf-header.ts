/**
 * Reusable PDF Header Component
 *
 * Generates consistent headers for ALL PDF documents
 * Uses brand styling from pdf-styles.ts
 */

import { PDF_BRAND_COLORS, PDF_FONTS } from './pdf-styles';

export interface PDFHeaderConfig {
  /** Company logo path (from LabConfiguration) */
  logoPath: string | null;
  /** Laboratory/company name */
  laboratoryName: string;
  /** Document code (e.g., "SOP-001", "DN-042", "INV-2024-123") */
  documentCode: string;
  /** Document version (optional, e.g., "v2.1") */
  documentVersion?: string;
  /** Document title (optional, shown under document code) */
  documentTitle?: string;
}

/**
 * Generate PDF header HTML
 *
 * This function creates a professional header with:
 * - Company logo (left side) from database settings
 * - Laboratory name and document info (right side)
 * - Consistent brand styling
 *
 * Works with Puppeteer's displayHeaderFooter option
 *
 * @param config - Header configuration
 * @returns HTML string for Puppeteer header
 */
export function generatePDFHeader(config: PDFHeaderConfig): string {
  const {
    logoPath,
    laboratoryName,
    documentCode,
    documentVersion,
    documentTitle,
  } = config;

  // Logo HTML (only if logo path exists)
  const logoHTML = logoPath
    ? `<img src="${logoPath}" style="height: 12mm; max-width: 40mm; object-fit: contain;" alt="${laboratoryName} Logo" />`
    : '';

  // Document version badge (only if version provided)
  const versionBadge = documentVersion
    ? `<span style="font-size: 7pt; color: ${PDF_BRAND_COLORS.muted}; margin-left: 4px;">${documentVersion}</span>`
    : '';

  // Document title line (only if title provided)
  const titleLine = documentTitle
    ? `<div style="font-size: 7pt; color: ${PDF_BRAND_COLORS.muted}; margin-top: 2px;">${documentTitle}</div>`
    : '';

  return `
    <div style="
      width: 100%;
      padding: 0 15mm;
      font-family: ${PDF_FONTS.family};
      font-size: ${PDF_FONTS.sizes.body};
      color: ${PDF_BRAND_COLORS.secondary};
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid ${PDF_BRAND_COLORS.borderLight};
      padding-bottom: 4mm;
    ">
      <!-- Left Side: Logo -->
      <div style="flex-shrink: 0;">
        ${logoHTML}
      </div>

      <!-- Right Side: Company Info & Document Details -->
      <div style="text-align: right;">
        <div style="font-weight: ${PDF_FONTS.weights.semibold}; color: ${PDF_BRAND_COLORS.blue}; font-size: ${PDF_FONTS.sizes.h4};">
          ${laboratoryName}
        </div>
        <div style="margin-top: 2px; font-size: ${PDF_FONTS.sizes.body}; color: ${PDF_BRAND_COLORS.primary};">
          ${documentCode}${versionBadge}
        </div>
        ${titleLine}
      </div>
    </div>
  `;
}

/**
 * Generate simplified header (no logo variant)
 *
 * Useful for internal documents or when logo is not available
 *
 * @param config - Header configuration
 * @returns HTML string for Puppeteer header
 */
export function generateSimplePDFHeader(config: PDFHeaderConfig): string {
  const { laboratoryName, documentCode, documentVersion, documentTitle } =
    config;

  const versionBadge = documentVersion ? ` ${documentVersion}` : '';
  const titleLine = documentTitle
    ? ` - ${documentTitle}`
    : '';

  return `
    <div style="
      width: 100%;
      padding: 0 15mm 4mm 15mm;
      font-family: ${PDF_FONTS.family};
      text-align: center;
      border-bottom: 1px solid ${PDF_BRAND_COLORS.borderLight};
    ">
      <div style="font-weight: ${PDF_FONTS.weights.semibold}; color: ${PDF_BRAND_COLORS.blue}; font-size: ${PDF_FONTS.sizes.h3};">
        ${laboratoryName}
      </div>
      <div style="font-size: ${PDF_FONTS.sizes.body}; color: ${PDF_BRAND_COLORS.secondary}; margin-top: 2px;">
        ${documentCode}${versionBadge}${titleLine}
      </div>
    </div>
  `;
}

/**
 * Generate header for Annex XIII compliance documents
 *
 * Special header variant for EU MDR Annex XIII certificates
 * Includes regulatory compliance badge
 *
 * @param config - Header configuration
 * @returns HTML string for Puppeteer header
 */
export function generateAnnexXIIIHeader(config: PDFHeaderConfig): string {
  const {
    logoPath,
    laboratoryName,
    documentCode,
    documentVersion,
  } = config;

  const logoHTML = logoPath
    ? `<img src="${logoPath}" style="height: 12mm; max-width: 40mm; object-fit: contain;" alt="${laboratoryName} Logo" />`
    : '';

  return `
    <div style="
      width: 100%;
      padding: 0 15mm;
      font-family: ${PDF_FONTS.family};
      font-size: ${PDF_FONTS.sizes.body};
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid ${PDF_BRAND_COLORS.blue};
      padding-bottom: 4mm;
    ">
      <!-- Left Side: Logo -->
      <div style="flex-shrink: 0;">
        ${logoHTML}
      </div>

      <!-- Right Side: Company Info & MDR Badge -->
      <div style="text-align: right;">
        <div style="font-weight: ${PDF_FONTS.weights.bold}; color: ${PDF_BRAND_COLORS.blue}; font-size: ${PDF_FONTS.sizes.h3};">
          ${laboratoryName}
        </div>
        <div style="
          display: inline-block;
          background: ${PDF_BRAND_COLORS.complianceBox.bg};
          border: 1px solid ${PDF_BRAND_COLORS.complianceBox.border};
          color: ${PDF_BRAND_COLORS.complianceBox.text};
          padding: 2px 6px;
          border-radius: 3px;
          font-size: ${PDF_FONTS.sizes.tiny};
          font-weight: ${PDF_FONTS.weights.semibold};
          margin-top: 2px;
        ">
          EU MDR ANNEX XIII
        </div>
        <div style="margin-top: 2px; font-size: ${PDF_FONTS.sizes.body}; color: ${PDF_BRAND_COLORS.primary};">
          ${documentCode}${documentVersion ? ` ${documentVersion}` : ''}
        </div>
      </div>
    </div>
  `;
}
