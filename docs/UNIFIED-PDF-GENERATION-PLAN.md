# Unified PDF Generation System - Implementation Plan

## Overview
Comprehensive plan to extend PDF generation across all Smilelab MDR screens with unified styling, standardized headers/footers, and centralized CSS management for consistent professional documents.

---

## Current State (As-Is)

### Existing PDF Generation
- **SOP PDFs**: Working implementation
  - Header: Company logo + document info
  - Footer: Copyright + page numbers + date
  - Styling: Clean, professional, 9pt font
  - Layout: No AI-style borders

### Limitations
- Only SOPs have PDF export
- Styling is hardcoded in SOP generator
- No reusable components
- Header/footer duplicated per document type

---

## Target State (To-Be)

### PDF Generation Coverage

#### ✅ Already Implemented
- [x] SOPs (Standard Operating Procedures)

#### 🎯 To Be Implemented

**Product & Pricing** (Priority: High)
- [ ] Price List PDF
  - All products with current prices
  - Category grouping
  - Effective date
  - Email-ready format

**Materials Management** (Priority: High)
- [ ] Material List PDF
  - All materials with LOT numbers
  - Stock levels
  - Expiry dates
  - FIFO order

**Dentist/Client Management** (Priority: High)
- [ ] Dentist Information Sheet
  - Complete company data
  - Contact information
  - Billing details
  - Order history summary
- [ ] Dentist List PDF
  - All registered dentists
  - Contact details
  - Active/inactive status

**Orders & Production** (Priority: Medium)
- [ ] Order Details PDF
  - Complete order information
  - Patient details (anonymized)
  - Teeth selection (FDI notation)
  - Products/materials used
  - Timeline and status

**Financial Documents** (Priority: High)
- [ ] Invoice PDF (enhanced)
  - Professional invoice format
  - Line items with pricing
  - Tax calculations
  - Payment terms
  - Bank details
- [ ] Outstanding Invoices Report
  - All unpaid invoices
  - Aging analysis
  - Total outstanding by dentist
  - Payment reminders

**Quality & Compliance** (Priority: Medium)
- [ ] Quality Control Report
  - QC inspection results
  - Approval/rejection records
  - Photos/notes
- [ ] Annex XIII Certificate (already planned)
  - EU MDR compliance document
  - Material traceability

---

## Architecture: Unified PDF System

### File Structure
```
lib/pdf/
├── base/
│   ├── pdf-generator.ts          # Core PDF generation engine
│   ├── pdf-styles.ts              # GLOBAL CSS for all PDFs
│   ├── pdf-header.ts              # Reusable header component
│   └── pdf-footer.ts              # Reusable footer component
│
├── templates/
│   ├── sop-pdf.ts                 # SOP-specific template
│   ├── price-list-pdf.ts          # Price list template
│   ├── material-list-pdf.ts       # Material list template
│   ├── dentist-info-pdf.ts        # Dentist info template
│   ├── dentist-list-pdf.ts        # Dentist list template
│   ├── order-pdf.ts               # Order details template
│   ├── invoice-pdf.ts             # Invoice template
│   ├── outstanding-invoices-pdf.ts # Outstanding invoices template
│   ├── qc-report-pdf.ts           # QC report template
│   └── annex-xiii-pdf.ts          # Annex XIII certificate
│
└── utils/
    ├── format-helpers.ts          # Date, currency, number formatting
    └── table-builders.ts          # Reusable table generators
```

### Core Components

#### 1. Global PDF Styles (`lib/pdf/base/pdf-styles.ts`)
```typescript
/**
 * CENTRALIZED CSS for ALL PDF documents
 * Changes here affect all generated PDFs globally
 */
export const PDF_STYLES = {
  // Typography
  fonts: {
    family: "'Helvetica', 'Arial', sans-serif",
    sizes: {
      h1: '16pt',
      h2: '12pt',
      h3: '10pt',
      body: '9pt',
      small: '8pt',
      tiny: '7pt',
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Colors
  colors: {
    primary: '#000',           // Main text
    secondary: '#666',         // Secondary text
    accent: '#2563eb',         // Accent color (if needed)
    border: '#ddd',            // Borders
    background: '#f9f9f9',     // Light backgrounds
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '30px',
  },

  // Layout
  layout: {
    pageMargins: {
      top: '25mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
    maxWidth: '100%',
  },

  // Tables
  tables: {
    borderWidth: '0.5pt',
    borderColor: '#ddd',
    headerBackground: '#f9f9f9',
    cellPadding: '6px',
  },
};

/**
 * Generate CSS string for PDF
 */
export function generatePDFCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${PDF_STYLES.fonts.family};
      font-size: ${PDF_STYLES.fonts.sizes.body};
      line-height: 1.5;
      color: ${PDF_STYLES.colors.primary};
    }

    h1 {
      font-size: ${PDF_STYLES.fonts.sizes.h1};
      font-weight: ${PDF_STYLES.fonts.weights.semibold};
      margin-bottom: ${PDF_STYLES.spacing.sm};
    }

    h2 {
      font-size: ${PDF_STYLES.fonts.sizes.h2};
      font-weight: ${PDF_STYLES.fonts.weights.semibold};
      margin-top: ${PDF_STYLES.spacing.lg};
      margin-bottom: ${PDF_STYLES.spacing.sm};
    }

    h3 {
      font-size: ${PDF_STYLES.fonts.sizes.h3};
      font-weight: ${PDF_STYLES.fonts.weights.semibold};
      margin-top: ${PDF_STYLES.spacing.md};
      margin-bottom: ${PDF_STYLES.spacing.xs};
    }

    p {
      margin-bottom: ${PDF_STYLES.spacing.sm};
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${PDF_STYLES.spacing.lg};
    }

    th, td {
      padding: ${PDF_STYLES.tables.cellPadding};
      text-align: left;
      border: ${PDF_STYLES.tables.borderWidth} solid ${PDF_STYLES.tables.borderColor};
    }

    th {
      background-color: ${PDF_STYLES.tables.headerBackground};
      font-weight: ${PDF_STYLES.fonts.weights.semibold};
      font-size: ${PDF_STYLES.fonts.sizes.small};
    }

    td {
      font-size: ${PDF_STYLES.fonts.sizes.body};
    }

    .text-secondary {
      color: ${PDF_STYLES.colors.secondary};
    }

    .text-small {
      font-size: ${PDF_STYLES.fonts.sizes.small};
    }

    .text-tiny {
      font-size: ${PDF_STYLES.fonts.sizes.tiny};
    }

    .page-break {
      page-break-before: always;
    }
  `;
}
```

#### 2. Reusable Header (`lib/pdf/base/pdf-header.ts`)
```typescript
import { LabConfiguration } from '@prisma/client';

export interface HeaderOptions {
  documentType: string;  // e.g., "Price List", "Invoice", "SOP"
  documentCode?: string; // e.g., "SOP-004", "INV-2024-001"
  versionNumber?: string;
}

export function generatePDFHeader(
  labConfig: LabConfiguration,
  options: HeaderOptions
): string {
  const logoHTML = labConfig.logoPath
    ? `<img src="${labConfig.logoPath}" style="height: 12mm; max-width: 40mm; object-fit: contain;" />`
    : '';

  return `
    <div style="width: 100%; padding: 0 15mm; font-size: 8pt; color: #666; display: flex; justify-content: space-between; align-items: center;">
      <div>${logoHTML}</div>
      <div style="text-align: right;">
        <div style="font-weight: 600; color: #000;">${labConfig.laboratoryName}</div>
        <div>${options.documentType}${options.documentCode ? ` - ${options.documentCode}` : ''}${options.versionNumber ? ` v${options.versionNumber}` : ''}</div>
      </div>
    </div>
  `;
}
```

#### 3. Reusable Footer (`lib/pdf/base/pdf-footer.ts`)
```typescript
import { LabConfiguration } from '@prisma/client';
import { format } from 'date-fns';

export function generatePDFFooter(labConfig: LabConfiguration): string {
  const currentYear = new Date().getFullYear();
  return `
    <div style="width: 100%; font-size: 7pt; padding: 5mm 15mm 0 15mm; color: #666; display: flex; justify-content: space-between; border-top: 0.5pt solid #ddd;">
      <span>© ${currentYear} ${labConfig.laboratoryName}. ${labConfig.city}, ${labConfig.country}</span>
      <span>
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </span>
      <span>${format(new Date(), 'MMM dd, yyyy')}</span>
    </div>
  `;
}
```

#### 4. Base PDF Generator (`lib/pdf/base/pdf-generator.ts`)
```typescript
import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';
import { generatePDFCSS } from './pdf-styles';
import { generatePDFHeader, HeaderOptions } from './pdf-header';
import { generatePDFFooter } from './pdf-footer';

interface PDFGeneratorOptions {
  htmlContent: string;
  headerOptions: HeaderOptions;
  filename: string;
}

export async function generatePDF(options: PDFGeneratorOptions): Promise<Buffer> {
  // Fetch lab configuration (cached)
  const labConfig = await fetchLabConfig();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Construct complete HTML with global styles
    const completeHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${generatePDFCSS()}</style>
      </head>
      <body>
        ${options.htmlContent}
      </body>
      </html>
    `;

    await page.setContent(completeHTML, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '25mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: generatePDFHeader(labConfig, options.headerOptions),
      footerTemplate: generatePDFFooter(labConfig),
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Cache lab config to avoid repeated DB queries
let cachedLabConfig: any = null;
async function fetchLabConfig() {
  if (cachedLabConfig) return cachedLabConfig;

  cachedLabConfig = await prisma.labConfiguration.findFirst({
    select: {
      laboratoryName: true,
      logoPath: true,
      city: true,
      country: true,
    },
  });

  return cachedLabConfig || {
    laboratoryName: 'Smilelab d.o.o.',
    logoPath: null,
    city: 'Ljubljana',
    country: 'Slovenia',
  };
}
```

---

## Implementation Roadmap

### Phase 1: Infrastructure (Week 1)
**Goal**: Build reusable PDF generation system

- [x] SOP PDF (already done)
- [ ] Create `lib/pdf/base/` structure
- [ ] Extract global styles to `pdf-styles.ts`
- [ ] Create reusable header component
- [ ] Create reusable footer component
- [ ] Build base PDF generator
- [ ] Refactor SOP generator to use new base

**Deliverables**:
- Unified PDF infrastructure
- SOP migrated to new system
- Global CSS file for styling

### Phase 2: Critical Documents (Week 2)
**Goal**: High-priority business documents

- [ ] **Price List PDF**
  - All products grouped by category
  - Current prices with effective date
  - Optional: price history comparison
  - Export button on pricing page

- [ ] **Invoice PDF (Enhanced)**
  - Professional invoice layout
  - Line items with quantities
  - Tax calculations
  - Payment terms and bank details
  - Downloadable from invoice list

- [ ] **Outstanding Invoices Report**
  - All unpaid invoices
  - Aging analysis (30, 60, 90+ days)
  - Total by dentist
  - Export from invoices dashboard

**Deliverables**:
- Price list export functionality
- Enhanced invoice PDFs
- Outstanding invoices report

### Phase 3: Client/Material Documents (Week 3)
**Goal**: Client and material management PDFs

- [ ] **Dentist Information Sheet**
  - Complete company profile
  - Contact details
  - Billing information
  - Order history summary
  - Export from dentist detail page

- [ ] **Dentist List PDF**
  - All registered dentists
  - Contact summary
  - Active/inactive filter
  - Export from dentist list page

- [ ] **Material List PDF**
  - All materials with LOT tracking
  - Stock levels and locations
  - Expiry dates highlighted
  - FIFO order indication
  - Export from materials page

**Deliverables**:
- Dentist info sheets
- Client list exports
- Material inventory reports

### Phase 4: Production Documents (Week 4)
**Goal**: Order and QC documentation

- [ ] **Order Details PDF**
  - Complete order information
  - Patient details (anonymized for GDPR)
  - FDI teeth notation visualization
  - Products and materials used
  - Timeline and status tracking
  - Export from order detail page

- [ ] **Quality Control Report**
  - QC inspection checklist
  - Pass/fail criteria
  - Inspector notes
  - Photo documentation
  - Export from QC page

**Deliverables**:
- Order documentation PDFs
- QC report generation

### Phase 5: Compliance Documents (Week 5)
**Goal**: EU MDR compliance documentation

- [ ] **Annex XIII Certificate**
  - EU MDR compliant certificate
  - Material traceability
  - Biocompatibility data
  - CE marking information
  - Auto-generate on QC approval

**Deliverables**:
- Complete MDR compliance documentation

---

## UI Integration Points

### Export Buttons to Add

| Page | Export Options | Priority |
|------|---------------|----------|
| Pricing List | "Export Price List PDF" | High |
| Material List | "Export Materials PDF" | High |
| Dentist Detail | "Generate Info Sheet PDF" | High |
| Dentist List | "Export Dentists PDF" | Medium |
| Order Detail | "Export Order PDF" | Medium |
| Invoice List | "Export Outstanding Invoices" | High |
| Invoice Detail | "Download Invoice PDF" (enhance) | High |
| QC Page | "Generate QC Report PDF" | Medium |
| SOP Detail | "Download PDF" (already done) | ✅ Done |

---

## Benefits of Unified System

### For Development
✅ **Single Source of Truth**: All PDF styling in one file
✅ **Consistent Branding**: Same header/footer across all documents
✅ **Easy Maintenance**: Change CSS once, affects all PDFs
✅ **Rapid Development**: Reusable components speed up new PDF types
✅ **Type Safety**: TypeScript interfaces ensure consistency

### For Business
✅ **Professional Documents**: Uniform, branded appearance
✅ **Time Savings**: One-click exports for clients/auditors
✅ **Compliance Ready**: All documents follow same standards
✅ **Email Ready**: Professional PDFs ready to send
✅ **Audit Trail**: PDF generation logged for compliance

---

## Design Specifications

### Common Header (All PDFs)
```
┌─────────────────────────────────────────────────┐
│ [Logo]                    Smilelab d.o.o.       │
│                           [Document Type]       │
│                           [Document Code]       │
└─────────────────────────────────────────────────┘
```

### Common Footer (All PDFs)
```
┌─────────────────────────────────────────────────┐
│ © 2026 Smilelab d.o.o. Ljubljana, Slovenia     │
│                    Page X of Y     Jan 10, 2026 │
└─────────────────────────────────────────────────┘
```

### Styling Guidelines
- **Font**: Helvetica/Arial
- **Size**: 9pt body, 16pt h1, 12pt h2, 10pt h3
- **Colors**: Black text (#000), gray secondary (#666)
- **Borders**: Thin (0.5pt), light gray (#ddd)
- **No**: Colored boxes, rounded corners, shadows, thick borders
- **Yes**: Clean tables, simple layout, professional appearance

---

## Testing Checklist

### Per PDF Type
- [ ] Header displays correctly with logo
- [ ] Footer shows company info, page numbers, date
- [ ] Content formatting is clean and readable
- [ ] Tables render properly
- [ ] Multi-page documents paginate correctly
- [ ] File downloads with correct name
- [ ] PDF opens in standard readers (Adobe, Preview, Chrome)

### Global Changes
- [ ] Changing font size in CSS affects all PDFs
- [ ] Changing colors updates all documents
- [ ] Logo change reflects across all PDFs
- [ ] Company info updates globally

---

## Success Metrics

### Technical
- ✅ Single CSS file managing all PDF styles
- ✅ Reusable header/footer components
- ✅ All document types use same infrastructure
- ✅ < 2 seconds PDF generation time

### Business
- ✅ 10+ document types with PDF export
- ✅ Professional, consistent branding
- ✅ Email-ready documents
- ✅ Compliance documentation complete

---

## Next Actions (Immediate)

1. **Approve Plan**: Review and confirm approach
2. **Prioritize**: Which PDF types are most urgent?
3. **Phase 1 Start**: Build unified infrastructure
4. **Test Migration**: Migrate SOP to new system
5. **Phase 2**: Implement priority PDFs (Price List, Invoices)

---

**Document Created**: 2026-01-10
**Status**: Planning - Awaiting approval
**Estimated Timeline**: 5 weeks for complete implementation
