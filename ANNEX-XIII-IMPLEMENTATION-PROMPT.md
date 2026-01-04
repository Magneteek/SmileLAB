# Annex XIII Document Generation - Implementation Prompt

## Project Context

**Project**: Smilelab MDR Management System
**Technology**: Next.js 15 (App Router), TypeScript, Prisma ORM, PostgreSQL
**Location**: `/Users/kris/CLAUDEtools/ORCHESTRAI/projects/smilelab-ec615192-0f63-48d1-96d5-44834d460e3d/deliverables/development/dental-lab-mdr`

## What Has Been Completed

✅ Complete database schema (Prisma) with 15+ models
✅ Authentication system (NextAuth.js with 4 roles: ADMIN, TECHNICIAN, QC_INSPECTOR, INVOICING)
✅ Order management workflow
✅ Worksheet creation and management
✅ Material LOT tracking (FIFO inventory)
✅ Quality Control workflow (inspection, approval/rejection)
✅ Invoicing (almost complete)

## Task: Implement EU MDR Annex XIII Document Generation

### Objective

Implement a production-ready PDF document generator that creates **EU MDR Annex XIII Manufacturer's Statements** for custom-made dental devices. This document must be automatically generated when a worksheet receives QC approval and must comply with EU Medical Device Regulation (MDR) requirements.

### Critical Requirements

#### 1. EU MDR Annex XIII Compliance

The Manufacturer's Statement must include:

- **Device Identification**
  - Worksheet number (DN-XXX format)
  - Device description and intended use
  - Patient name/ID (anonymized per GDPR)
  - Manufacture date

- **Prescriber Information**
  - Dentist name and license number
  - Clinic name and contact details

- **Material Traceability** (CRITICAL)
  - Complete list of all materials used
  - Manufacturer details for each material
  - LOT numbers for all materials (forward traceability)
  - Expiry dates
  - Quantities used
  - Tooth-specific material assignments (if applicable)

- **Conformity Declaration**
  - CE marking status
  - Biocompatibility data (ISO 10993 references)
  - Manufacturer's declaration of conformity
  - Responsible person signature line

- **Retention Tracking**
  - Document generation date
  - 10-year retention period calculation (`retentionUntil = generationDate + 10 years`)

#### 2. Technical Requirements

**PDF Generation**: Use Puppeteer (headless Chrome)
**Template Engine**: Handlebars (`.hbs` or `.html` with Handlebars syntax)
**Storage**: Save PDF as Base64 in `Document` table in PostgreSQL
**Trigger**: Automatic generation when worksheet status transitions to `QC_APPROVED`

#### 3. Database Models Reference

**Key Models Used**:

```typescript
// WorkSheet - The device being manufactured
model WorkSheet {
  id                String
  worksheetNumber   String    // DN-001, DN-002, etc.
  deviceDescription String?
  intendedUse       String?
  manufactureDate   DateTime?
  patientName       String?   // Anonymized

  order             Order
  products          WorksheetProduct[]
  materials         WorksheetMaterial[]  // Direct materials
  teeth             WorksheetTooth[]
  documents         Document[]           // Generated Annex XIII PDFs
  qualityControls   QualityControl[]
}

// WorksheetProduct - Products on the worksheet
model WorksheetProduct {
  id                String
  worksheetId       String
  productId         String
  quantity          Int

  product           Product
  productMaterials  ProductMaterial[]    // Materials used for this product
}

// ProductMaterial - Materials used for specific products
model ProductMaterial {
  id                String
  worksheetProductId String
  materialId        String
  materialLotId     String?
  quantityUsed      Decimal
  toothNumber       String?
  notes             String?

  worksheetProduct  WorksheetProduct
  material          Material
  materialLot       MaterialLot?
}

// WorksheetMaterial - Direct materials (not via products)
model WorksheetMaterial {
  id            String
  worksheetId   String
  materialId    String
  materialLotId String?
  quantityUsed  Decimal
  notes         String?

  worksheet     WorkSheet
  material      Material
  materialLot   MaterialLot?
}

// Material - Material catalog
model Material {
  id              String
  code            String
  name            String
  manufacturer    String
  type            String        // CERAMIC, METAL, RESIN, etc.
  biocompatible   Boolean
  ceMarking       Boolean
  unit            String        // g, ml, pcs
}

// MaterialLot - LOT tracking for traceability
model MaterialLot {
  id                 String
  materialId         String
  lotNumber          String    // CRITICAL for traceability
  expiryDate         DateTime?
  arrivalDate        DateTime
  certificateUrl     String?

  material           Material
}

// Document - Stores generated PDFs
model Document {
  id            String
  worksheetId   String?
  documentType  DocumentType  // ANNEX_XIII, INVOICE, etc.
  filePath      String?       // Optional file system path
  fileData      Bytes?        // PDF stored as Base64 in database
  generatedAt   DateTime
  retentionUntil DateTime     // CRITICAL: generatedAt + 10 years

  worksheet     WorkSheet?
}

enum DocumentType {
  ANNEX_XIII
  INVOICE
  QUALITY_REPORT
  TECHNICAL_FILE
}
```

### Files to Create

#### 1. **PDF Generator Service**
**File**: `lib/pdf/annex-xiii-generator.ts`
**Estimated**: 300-400 lines

**Required Functions**:

```typescript
interface AnnexXIIIData {
  worksheet: WorkSheetWithRelations;
  generatedBy: User;
}

/**
 * Generate Annex XIII PDF for a worksheet
 * @param worksheetId - Worksheet ID
 * @param userId - User generating the document
 * @returns Document record with PDF data
 */
export async function generateAnnexXIII(
  worksheetId: string,
  userId: string
): Promise<Document>;

/**
 * Compile Handlebars template with worksheet data
 */
async function compileTemplate(data: AnnexXIIIData): Promise<string>;

/**
 * Generate PDF from HTML using Puppeteer
 */
async function generatePDF(html: string): Promise<Buffer>;
```

**Implementation Requirements**:
- Fetch complete worksheet data with all relations (order, dentist, products, materials, LOTs)
- Compile Handlebars template with data
- Use Puppeteer to generate PDF from HTML
- Save PDF to `Document` table as Base64
- Set `retentionUntil = new Date() + 10 years`
- Create audit log entry
- Handle errors gracefully (missing LOTs, expired materials, etc.)

#### 2. **Handlebars Template**
**File**: `lib/pdf/templates/annex-xiii.hbs` (or `.html`)
**Estimated**: 200-300 lines

**Template Sections**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EU MDR Annex XIII - Manufacturer's Statement</title>
  <style>
    /* Professional medical document styling */
    /* A4 page size, margins, headers, footers */
    /* Tables for material traceability */
  </style>
</head>
<body>
  <!-- HEADER -->
  <header>
    <h1>EU MDR Annex XIII</h1>
    <h2>Manufacturer's Statement for Custom-Made Devices</h2>
  </header>

  <!-- SECTION 1: Device Identification -->
  <section class="device-info">
    <h3>1. Device Identification</h3>
    <table>
      <tr><td>Worksheet Number:</td><td>{{worksheetNumber}}</td></tr>
      <tr><td>Device Description:</td><td>{{deviceDescription}}</td></tr>
      <tr><td>Intended Use:</td><td>{{intendedUse}}</td></tr>
      <tr><td>Manufacture Date:</td><td>{{manufactureDate}}</td></tr>
      <tr><td>Patient:</td><td>{{patientName}}</td></tr>
    </table>
  </section>

  <!-- SECTION 2: Prescriber Information -->
  <section class="prescriber-info">
    <h3>2. Prescriber Information</h3>
    <table>
      <tr><td>Dentist:</td><td>{{dentist.name}}</td></tr>
      <tr><td>License Number:</td><td>{{dentist.licenseNumber}}</td></tr>
      <tr><td>Clinic:</td><td>{{dentist.clinicName}}</td></tr>
      <tr><td>Contact:</td><td>{{dentist.email}} / {{dentist.phone}}</td></tr>
    </table>
  </section>

  <!-- SECTION 3: Material Traceability (CRITICAL) -->
  <section class="material-traceability">
    <h3>3. Material Traceability</h3>
    <table class="materials-table">
      <thead>
        <tr>
          <th>Material Code</th>
          <th>Material Name</th>
          <th>Manufacturer</th>
          <th>LOT Number</th>
          <th>Expiry Date</th>
          <th>Quantity Used</th>
          <th>Tooth</th>
          <th>CE Marking</th>
          <th>Biocompatible</th>
        </tr>
      </thead>
      <tbody>
        {{#each materials}}
        <tr>
          <td>{{code}}</td>
          <td>{{name}}</td>
          <td>{{manufacturer}}</td>
          <td>{{lotNumber}}</td>
          <td>{{expiryDate}}</td>
          <td>{{quantityUsed}} {{unit}}</td>
          <td>{{toothNumber}}</td>
          <td>{{#if ceMarking}}✓{{else}}—{{/if}}</td>
          <td>{{#if biocompatible}}✓{{else}}—{{/if}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </section>

  <!-- SECTION 4: Conformity Declaration -->
  <section class="conformity">
    <h3>4. Declaration of Conformity</h3>
    <p>
      We, [Manufacturer Name], hereby declare that the custom-made dental device
      described above has been manufactured in accordance with EU MDR requirements
      and applicable standards.
    </p>
    <p><strong>ISO 10993 Biocompatibility:</strong> All materials used comply with ISO 10993 standards.</p>
    <p><strong>CE Marking:</strong> All materials are CE marked where applicable.</p>
  </section>

  <!-- SECTION 5: Signatures -->
  <section class="signatures">
    <div class="signature-block">
      <p>Responsible Person:</p>
      <p>_______________________</p>
      <p>Date: {{generationDate}}</p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <p>Document Retention: This document must be retained until {{retentionUntil}}</p>
    <p>Generated: {{generationDate}} by {{generatedBy}}</p>
  </footer>
</body>
</html>
```

#### 3. **API Route** (Optional - if not triggered automatically)
**File**: `app/api/documents/annex-xiii/[worksheetId]/route.ts`
**Estimated**: 100 lines

```typescript
/**
 * POST /api/documents/annex-xiii/:worksheetId
 * Generate Annex XIII document for a worksheet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  // Check authentication
  // Verify worksheet exists and is QC_APPROVED
  // Call generateAnnexXIII()
  // Return document download or success response
}
```

### Integration Points

#### Automatic Generation on QC Approval

**Current QC API Route**: `app/api/quality-control/[worksheetId]/route.ts`

After QC approval (around line 294), add:

```typescript
// After successful QC approval transaction
if (data.result === 'APPROVED' || data.result === 'CONDITIONAL') {
  // Generate Annex XIII document
  try {
    await generateAnnexXIII(worksheetId, session.user.id);
  } catch (error) {
    console.error('Failed to generate Annex XIII:', error);
    // Don't fail the QC approval - log error for manual retry
  }
}
```

### Testing Requirements

1. **Unit Tests**: Test PDF generation with sample data
2. **Integration Tests**: Test full workflow (QC approval → Annex XIII generation)
3. **Validation Tests**:
   - All required fields present
   - Material traceability complete (all LOT numbers)
   - PDF generation successful
   - 10-year retention calculation correct
   - GDPR compliance (patient data anonymization)

### Environment Variables

Add to `.env.local`:

```bash
# Puppeteer Configuration
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"  # Adjust for your OS
```

### Success Criteria

✅ Annex XIII PDF generated automatically on QC approval
✅ All EU MDR required fields included
✅ Complete material traceability (all LOT numbers)
✅ PDF stored in database with 10-year retention
✅ Professional medical document formatting
✅ Audit log created for document generation
✅ Error handling for edge cases (missing LOTs, expired materials)
✅ GDPR compliant (patient data anonymized)

### Edge Cases to Handle

1. **Missing LOT Numbers**: Materials without LOT assignments
2. **Expired Materials**: Materials past expiry date
3. **Missing Patient Data**: Worksheet without patient name
4. **Missing Dentist License**: Dentist without license number
5. **No Materials**: Worksheet with products but no materials assigned
6. **Puppeteer Errors**: PDF generation failures

### References

- **EU MDR Documentation**: [EUR-Lex Link](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32017R0745)
- **Annex XIII Requirements**: Chapter II, Article 52(8)
- **ISO 10993**: Biocompatibility standard for medical devices
- **GDPR**: Patient data anonymization requirements

### Implementation Strategy

1. **Start with Template** (2-3h): Create Handlebars template with static sample data
2. **PDF Generator** (3-4h): Implement Puppeteer PDF generation from template
3. **Data Integration** (2-3h): Fetch and structure worksheet data for template
4. **Storage** (1-2h): Save PDF to database with retention tracking
5. **QC Integration** (1h): Hook into QC approval workflow
6. **Testing** (2-3h): Test all edge cases and scenarios
7. **Error Handling** (1-2h): Implement comprehensive error handling

**Total Estimated Time**: 12-18 hours

---

## Getting Started

1. Review the database schema in `prisma/schema.prisma`
2. Examine the QC approval workflow in `app/api/quality-control/[worksheetId]/route.ts`
3. Create the Handlebars template first with sample data
4. Implement the PDF generator service
5. Test with a QC-approved worksheet
6. Integrate with QC approval workflow
7. Handle edge cases and errors

## Questions to Clarify Before Starting

- Should the PDF be downloadable immediately after generation?
- What should happen if Annex XIII generation fails during QC approval?
- Should there be a "Regenerate Annex XIII" option in the UI?
- What's the company/manufacturer name and address to include in the declaration?
- Who is the designated "Responsible Person" for signing?

---

**Good luck with the implementation! This is a critical regulatory requirement for EU MDR compliance.**
