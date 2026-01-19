/**
 * Global PDF Styles - Extracted from Annex XIII Template
 *
 * SINGLE SOURCE OF TRUTH for all PDF styling
 * Changes here affect ALL generated PDFs globally
 */

export const PDF_BRAND_COLORS = {
  // Primary brand colors (from Annex XIII)
  blue: '#007289',
  orange: '#D2804D',
  blueBg: '#e0f2f7',
  orangeBg: '#fef3e7',

  // Neutral colors
  primary: '#333',
  secondary: '#475569',
  muted: '#64748b',
  light: '#94a3b8',
  white: '#fff',
  border: '#ddd',
  borderLight: '#e2e8f0',

  // Background colors
  bgLight: '#f8f9fa',
  bgLighter: '#f9fafb',
  bgSection: '#f1f5f9',

  // Badge colors
  warning: {
    bg: '#fef3c7',
    text: '#92400e',
  },
  success: {
    bg: '#d1fae5',
    text: '#065f46',
  },
  info: {
    bg: '#dbeafe',
    text: '#1e40af',
  },
  danger: {
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#dc2626',
  },
  alert: {
    bg: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
  },
  complianceBox: {
    bg: '#e0f2fe',
    border: '#0284c7',
    text: '#075985',
  },
};

export const PDF_FONTS = {
  family: "'Arial', 'Helvetica', sans-serif",
  sizes: {
    h1: '17pt',      // Document titles
    h2: '12pt',      // Section titles
    h3: '10pt',      // Subsection titles
    h4: '8pt',       // Table headers/small headings
    body: '8pt',     // Standard body text
    small: '8pt',    // Small text
    tiny: '7pt',     // Footers, fine print
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.3',
    normal: '1.4',
    relaxed: '1.5',
    loose: '1.6',
  },
};

export const PDF_SPACING = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '12px',
  '3xl': '15px',
  '4xl': '20px',
  '5xl': '30px',
  '6xl': '40px',
};

export const PDF_LAYOUT = {
  padding: {
    page: '15px 30px',
    section: '8px',
    table: '4px 6px',
    box: '10px',
    boxLarge: '12px',
  },
  gap: {
    grid: '15px',
    gridLarge: '20px',
  },
  borderRadius: {
    sm: '3px',
    md: '4px',
  },
};

export const PDF_BORDERS = {
  widths: {
    thin: '1px',
    normal: '1.5px',
    thick: '2px',
    accent: '4px',
  },
  colors: {
    default: PDF_BRAND_COLORS.border,
    light: PDF_BRAND_COLORS.borderLight,
    primary: PDF_BRAND_COLORS.blue,
    dark: '#1e293b',
  },
};

/**
 * Generate complete CSS stylesheet for PDFs
 * This is injected into all PDF documents
 */
export function generatePDFCSS(): string {
  return `
    /* ============================================================================
       GLOBAL RESET
       ============================================================================ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ============================================================================
       BODY & TYPOGRAPHY
       ============================================================================ */
    body {
      font-family: ${PDF_FONTS.family};
      font-size: ${PDF_FONTS.sizes.body};
      color: ${PDF_BRAND_COLORS.primary};
      padding: ${PDF_LAYOUT.padding.page};
      background: ${PDF_BRAND_COLORS.white};
      line-height: ${PDF_FONTS.lineHeight.normal};
    }

    /* ============================================================================
       BRAND COLORS (Utility Classes)
       ============================================================================ */
    .brand-blue { color: ${PDF_BRAND_COLORS.blue}; }
    .brand-orange { color: ${PDF_BRAND_COLORS.orange}; }
    .bg-brand-blue { background-color: ${PDF_BRAND_COLORS.blueBg}; }
    .bg-brand-orange { background-color: ${PDF_BRAND_COLORS.orangeBg}; }

    /* ============================================================================
       HEADINGS
       ============================================================================ */
    h1 {
      font-size: ${PDF_FONTS.sizes.h1};
      color: ${PDF_BRAND_COLORS.blue};
      margin-bottom: ${PDF_SPACING.sm};
      font-weight: ${PDF_FONTS.weights.bold};
    }

    h2 {
      font-size: ${PDF_FONTS.sizes.h2};
      color: ${PDF_BRAND_COLORS.muted};
      font-weight: ${PDF_FONTS.weights.normal};
      margin-bottom: ${PDF_SPACING.xl};
    }

    h3 {
      font-size: ${PDF_FONTS.sizes.h3};
      color: ${PDF_BRAND_COLORS.blue};
      border-bottom: ${PDF_BORDERS.widths.normal} solid ${PDF_BRAND_COLORS.blue};
      padding-bottom: ${PDF_SPACING.sm};
      margin-bottom: ${PDF_SPACING.md};
      font-weight: ${PDF_FONTS.weights.semibold};
    }

    h4 {
      font-size: ${PDF_FONTS.sizes.h4};
      font-weight: ${PDF_FONTS.weights.semibold};
      color: ${PDF_BRAND_COLORS.blue};
      margin-bottom: ${PDF_SPACING.md};
      background-color: ${PDF_BRAND_COLORS.bgSection};
      padding: ${PDF_SPACING.md};
    }

    p {
      margin-bottom: ${PDF_SPACING.lg};
    }

    /* ============================================================================
       SECTIONS
       ============================================================================ */
    section {
      margin-bottom: ${PDF_SPACING['2xl']};
      page-break-inside: avoid;
    }

    section.bg-brand-blue,
    section.bg-brand-orange {
      padding: ${PDF_LAYOUT.padding.section};
      border-radius: ${PDF_LAYOUT.borderRadius.md};
    }

    /* ============================================================================
       GRID LAYOUTS
       ============================================================================ */
    .grid-50-50 {
      display: grid;
      grid-template-columns: 50% 50%;
      gap: ${PDF_LAYOUT.gap.grid};
      align-items: start;
    }

    .grid-30-70 {
      display: grid;
      grid-template-columns: 30% 70%;
      gap: ${PDF_LAYOUT.gap.gridLarge};
      align-items: start;
    }

    .grid-column {
      width: 100%;
    }

    /* ============================================================================
       TABLES - INFO TABLES
       ============================================================================ */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${PDF_SPACING.lg};
    }

    .info-table tr {
      border-bottom: ${PDF_BORDERS.widths.thin} solid ${PDF_BRAND_COLORS.borderLight};
    }

    .info-table td {
      padding: ${PDF_LAYOUT.padding.table};
      font-size: ${PDF_FONTS.sizes.body};
      line-height: ${PDF_FONTS.lineHeight.tight};
    }

    .info-table td:first-child {
      font-weight: ${PDF_FONTS.weights.semibold};
      color: ${PDF_BRAND_COLORS.secondary};
      width: 35%;
    }

    .info-table td:last-child {
      color: #1e293b;
    }

    /* ============================================================================
       TABLES - DATA TABLES (Products, Materials, etc.)
       ============================================================================ */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: ${PDF_SPACING.md};
      font-size: ${PDF_FONTS.sizes.body};
    }

    .data-table thead {
      background: ${PDF_BRAND_COLORS.blue};
      color: ${PDF_BRAND_COLORS.white};
    }

    .data-table th {
      padding: ${PDF_SPACING.sm} ${PDF_SPACING.sm};
      text-align: left;
      font-weight: ${PDF_FONTS.weights.semibold};
      font-size: ${PDF_FONTS.sizes.body};
      border: ${PDF_BORDERS.widths.thin} solid #005666;
    }

    .data-table th.right {
      text-align: right;
    }

    .data-table th.center {
      text-align: center;
    }

    .data-table td {
      padding: ${PDF_SPACING.sm} ${PDF_SPACING.sm};
      border: ${PDF_BORDERS.widths.thin} solid ${PDF_BRAND_COLORS.border};
      font-size: ${PDF_FONTS.sizes.body};
    }

    .data-table .right {
      text-align: right;
    }

    .data-table .center {
      text-align: center;
    }

    /* Product rows (category headers in tables) */
    .product-row {
      background: #f0f7f9;
      font-weight: ${PDF_FONTS.weights.semibold};
      color: ${PDF_BRAND_COLORS.blue};
    }

    .product-row td {
      padding: ${PDF_SPACING.sm} ${PDF_SPACING.sm};
      border: ${PDF_BORDERS.widths.thin} solid ${PDF_BRAND_COLORS.border};
      font-size: ${PDF_FONTS.sizes.body};
    }

    /* Material rows (nested items) */
    .material-row {
      background: ${PDF_BRAND_COLORS.white};
    }

    .material-row td {
      padding: ${PDF_SPACING.sm} ${PDF_SPACING.sm};
      border: ${PDF_BORDERS.widths.thin} solid ${PDF_BRAND_COLORS.border};
      font-size: ${PDF_FONTS.sizes.body};
    }

    .material-row td:first-child {
      padding-left: ${PDF_SPACING['3xl']}; /* Indent to show nesting */
    }

    .data-table tbody tr:nth-child(even) .material-row {
      background: ${PDF_BRAND_COLORS.bgLight};
    }

    /* ============================================================================
       BADGES & STATUS INDICATORS
       ============================================================================ */
    .badge {
      display: inline-block;
      padding: ${PDF_SPACING.xs} ${PDF_SPACING.md};
      border-radius: ${PDF_LAYOUT.borderRadius.sm};
      font-size: ${PDF_FONTS.sizes.body};
      font-weight: ${PDF_FONTS.weights.semibold};
    }

    .badge-warning {
      background: ${PDF_BRAND_COLORS.warning.bg};
      color: ${PDF_BRAND_COLORS.warning.text};
    }

    .badge-success {
      background: ${PDF_BRAND_COLORS.success.bg};
      color: ${PDF_BRAND_COLORS.success.text};
    }

    .badge-info {
      background: ${PDF_BRAND_COLORS.info.bg};
      color: ${PDF_BRAND_COLORS.info.text};
    }

    .checkmark {
      color: #16a34a;
      font-weight: bold;
      font-size: ${PDF_FONTS.sizes.body};
    }

    .dash {
      color: ${PDF_BRAND_COLORS.light};
    }

    /* ============================================================================
       SPECIAL BOXES (Declarations, Compliance, etc.)
       ============================================================================ */
    .declaration {
      background: ${PDF_BRAND_COLORS.alert.bg};
      border-left: ${PDF_BORDERS.widths.accent} solid ${PDF_BRAND_COLORS.alert.border};
      padding: ${PDF_LAYOUT.padding.boxLarge};
      margin: ${PDF_SPACING['3xl']} 0;
      font-size: ${PDF_FONTS.sizes.body};
      line-height: ${PDF_FONTS.lineHeight.loose};
    }

    .declaration p {
      margin-bottom: ${PDF_SPACING.xl};
    }

    .declaration ul {
      margin-left: ${PDF_SPACING['4xl']};
      margin-top: ${PDF_SPACING.xl};
    }

    .declaration strong {
      color: ${PDF_BRAND_COLORS.alert.text};
    }

    .compliance-box {
      background: ${PDF_BRAND_COLORS.complianceBox.bg};
      border-left: ${PDF_BORDERS.widths.accent} solid ${PDF_BRAND_COLORS.complianceBox.border};
      padding: ${PDF_LAYOUT.padding.boxLarge};
      margin: ${PDF_SPACING['3xl']} 0;
      font-size: ${PDF_FONTS.sizes.body};
      line-height: ${PDF_FONTS.lineHeight.loose};
    }

    .compliance-box p {
      margin-bottom: ${PDF_SPACING.lg};
    }

    .compliance-box strong {
      color: ${PDF_BRAND_COLORS.complianceBox.text};
    }

    .retention-notice {
      background: ${PDF_BRAND_COLORS.danger.bg};
      border-left: ${PDF_BORDERS.widths.accent} solid ${PDF_BRAND_COLORS.danger.border};
      padding: ${PDF_LAYOUT.padding.box};
      margin: ${PDF_SPACING['4xl']} 0;
      font-size: ${PDF_FONTS.sizes.body};
      color: ${PDF_BRAND_COLORS.danger.text};
      font-weight: ${PDF_FONTS.weights.semibold};
    }

    /* ============================================================================
       SIGNATURES
       ============================================================================ */
    .signatures {
      margin-top: ${PDF_SPACING['5xl']};
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }

    .signature-block {
      width: 45%;
      text-align: center;
    }

    .signature-line {
      margin-top: ${PDF_SPACING['6xl']};
      border-top: ${PDF_BORDERS.widths.thick} solid #1e293b;
      padding-top: ${PDF_SPACING.sm};
      font-size: ${PDF_FONTS.sizes.body};
    }

    .signature-block p {
      margin: ${PDF_SPACING.sm} 0;
      font-size: ${PDF_FONTS.sizes.body};
    }

    .signature-block .title {
      font-weight: ${PDF_FONTS.weights.semibold};
      color: ${PDF_BRAND_COLORS.blue};
    }

    /* ============================================================================
       HEADER & FOOTER (Document Level)
       ============================================================================ */
    .header {
      display: grid;
      grid-template-columns: 30% 70%;
      gap: ${PDF_LAYOUT.gap.gridLarge};
      margin-bottom: ${PDF_SPACING['3xl']};
      padding-bottom: ${PDF_SPACING.xl};
      border-bottom: ${PDF_BORDERS.widths.thick} solid ${PDF_BRAND_COLORS.blue};
      align-items: start;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .logo {
      max-width: 100%;
      max-height: 70px;
      width: auto;
      height: auto;
    }

    .header-right {
      text-align: right;
      font-size: ${PDF_FONTS.sizes.body};
      line-height: ${PDF_FONTS.lineHeight.tight};
      color: ${PDF_BRAND_COLORS.primary};
    }

    .footer {
      margin-top: ${PDF_SPACING['5xl']};
      padding-top: ${PDF_SPACING['3xl']};
      border-top: ${PDF_BORDERS.widths.thin} solid ${PDF_BRAND_COLORS.border};
      font-size: ${PDF_FONTS.sizes.body};
      color: ${PDF_BRAND_COLORS.primary};
      line-height: ${PDF_FONTS.lineHeight.relaxed};
    }

    .bottom-footer {
      margin-top: ${PDF_SPACING['4xl']};
      padding-top: ${PDF_SPACING['2xl']};
      border-top: ${PDF_BORDERS.widths.thick} solid ${PDF_BRAND_COLORS.blue};
      font-size: ${PDF_FONTS.sizes.body};
      text-align: center;
      color: ${PDF_BRAND_COLORS.primary};
      line-height: ${PDF_FONTS.lineHeight.loose};
    }

    /* ============================================================================
       UTILITY CLASSES
       ============================================================================ */
    .bold { font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-secondary { color: ${PDF_BRAND_COLORS.secondary}; }
    .mt-10 { margin-top: ${PDF_SPACING.xl}; }
    .mt-20 { margin-top: ${PDF_SPACING['4xl']}; }
    .mb-10 { margin-bottom: ${PDF_SPACING.xl}; }
    .mb-20 { margin-bottom: ${PDF_SPACING['4xl']}; }

    /* ============================================================================
       PRINT OPTIMIZATIONS
       ============================================================================ */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      section {
        page-break-inside: avoid;
      }

      .page-break {
        page-break-before: always;
      }
    }

    /* ============================================================================
       PAGE NUMBERING (for Puppeteer PDFs)
       ============================================================================ */
    @page {
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-size: ${PDF_FONTS.sizes.body};
        color: #666;
        font-family: ${PDF_FONTS.family};
      }
    }
  `;
}
