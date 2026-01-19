/**
 * Unified PDF Infrastructure - Central Export
 *
 * Single import point for all PDF generation needs
 *
 * @example
 * ```typescript
 * import {
 *   generatePDF,
 *   generatePDFHeader,
 *   generatePDFFooter,
 *   PDF_BRAND_COLORS
 * } from '@/lib/pdf/base';
 * ```
 */

// PDF Generation
export {
  generatePDF,
  generatePDFFromTemplate,
  generatePDFBatch,
  savePDFToFile,
  pdfToBase64,
  estimatePDFGenerationTime,
  type PDFGeneratorConfig,
  type PDFGeneratorResult,
} from './pdf-generator';

// PDF Styling
export {
  generatePDFCSS,
  PDF_BRAND_COLORS,
  PDF_FONTS,
  PDF_SPACING,
  PDF_LAYOUT,
  PDF_BORDERS,
} from './pdf-styles';

// PDF Headers
export {
  generatePDFHeader,
  generateSimplePDFHeader,
  generateAnnexXIIIHeader,
  type PDFHeaderConfig,
} from './pdf-header';

// PDF Footers
export {
  generatePDFFooter,
  generateSimplePDFFooter,
  generateComplianceFooter,
  generateInvoiceFooter,
  type PDFFooterConfig,
} from './pdf-footer';
