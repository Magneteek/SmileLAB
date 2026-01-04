# Quality Control Implementation Plan

## MDR Compliance Requirements (from IMPLEMENTATION-PLAN.md)

### Mandatory QC Workflow
- **Gate Requirement**: QC approval is **mandatory** before:
  - Invoice generation
  - Annex XIII (MDR document) generation
- **QC Rejection**: Returns worksheet to IN_PRODUCTION status with rework notes
- **Traceability**: All QC actions must be audited (inspector, date, decision, notes)

### QC Checklist Items (EU MDR Standards)
Based on custom-made dental device requirements:

1. **Dimensional Accuracy** → `fit` (Boolean)
   - Verifies device meets prescribed dimensions
   - Critical for proper seating and function

2. **Shade Matching** → `shade` (Boolean)
   - Color match to prescribed shade
   - Aesthetic requirement

3. **Fit Verification** → `occlusion` (Boolean)
   - Bite alignment
   - Functional requirement

4. **Surface Quality** → `aesthetics` (Boolean)
   - Visual appearance
   - Polish, texture, finish

5. **Margin Quality** → `margins` (Boolean)
   - Crown/bridge margin integrity
   - Sealing and longevity

### Database Schema (Existing - No Changes Needed)

```prisma
model QualityControl {
  id              String     @id @default(cuid())
  worksheetId     String     // 1:1 with WorkSheet
  worksheet       WorkSheet  @relation(...)

  inspectorId     String
  inspector       User       @relation(...) // Must have QC_INSPECTOR or ADMIN role

  // QC Results
  result          QCResult   @default(PENDING) // PENDING, APPROVED, REJECTED, CONDITIONAL
  inspectionDate  DateTime   @default(now())

  // Checklist (5 Boolean fields)
  aesthetics      Boolean?   // Surface quality
  fit             Boolean?   // Dimensional accuracy
  occlusion       Boolean?   // Bite alignment
  shade           Boolean?   // Color match
  margins         Boolean?   // Margin integrity

  // Documentation
  notes           String?    @db.Text // General notes
  actionRequired  String?    @db.Text // Rejection reasons/rework instructions

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

enum QCResult {
  PENDING       // Default state
  APPROVED      // Passes all checks
  REJECTED      // Fails one or more checks, needs rework
  CONDITIONAL   // Approved with minor notes (not blocking)
}
```

---

## Implementation Components

### 1. QC Dashboard (List View)
**Route**: `/quality-control`
**Access**: QC_INSPECTOR, ADMIN roles only

**Features**:
- List all worksheets with status `QC_PENDING`
- Show worksheet details: DN-number, dentist, patient, products
- Filter by: status, inspector, date range
- Quick actions: "Inspect", "View History"
- Statistics: Pending count, today's inspections, approval rate

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Quality Control Dashboard                                   │
├─────────────────────────────────────────────────────────────┤
│ Filters: [ All | Pending | Approved | Rejected ]            │
│ Search: [_______________]  Inspector: [All ▼]  Date: [___]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DN-002 | Dr. Smith | John Doe | Crown x2 | Pending      │ │
│ │ Created: 12/27/2025  Products: 2  Materials: 3          │ │
│ │ [Inspect Now]                                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DN-003 | Dr. Jones | Jane Smith | Bridge x1 | Pending  │ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. QC Inspection Interface
**Route**: `/worksheets/[id]/qc` or `/quality-control/inspect/[id]`
**Access**: QC_INSPECTOR, ADMIN roles only

**Features**:
- Display full worksheet details (read-only):
  - Dentist info
  - Patient name
  - Products ordered
  - Materials used (with LOT numbers)
  - Teeth selected (FDI notation)
- **Interactive QC Checklist** (5 Boolean checkboxes):
  - ☐ Aesthetics (Surface quality)
  - ☐ Fit (Dimensional accuracy)
  - ☐ Occlusion (Bite alignment)
  - ☐ Shade (Color match)
  - ☐ Margins (Margin integrity)
- **Notes** (optional text area)
- **Action Required** (required if rejecting - what needs fixing)
- **Decision Buttons**:
  - [Approve] → Sets result=APPROVED, transitions worksheet to QC_APPROVED
  - [Conditional Approve] → Sets result=CONDITIONAL (approve with notes)
  - [Reject] → Sets result=REJECTED, transitions worksheet to QC_REJECTED, requires actionRequired text

**UI Layout**:
```
┌────────────────────────────────────────────────────────────────┐
│ Quality Control Inspection - DN-002                            │
├────────────────────────────────────────────────────────────────┤
│ Worksheet Details                                              │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Dentist: Dr. Petra Zupan                                   │ │
│ │ Patient: John Doe                                          │ │
│ │ Products: Crown x2 (Tooth 11, 21)                          │ │
│ │ Materials: Ceramic (LOT-CER-001-2025), Zirconia (...)      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ QC Checklist (Check all that pass)                             │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ☑ Aesthetics - Surface quality and finish                  │ │
│ │ ☑ Fit - Dimensional accuracy and seating                   │ │
│ │ ☑ Occlusion - Bite alignment and contact                   │ │
│ │ ☐ Shade - Color match to prescription (A2)                 │ │
│ │ ☑ Margins - Crown margin integrity and sealing             │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Inspector Notes (optional)                                      │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Shade slightly off - needs minor adjustment                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Action Required (if rejecting)                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Re-shade tooth 11 to match A2 more closely                 │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [← Back]  [Approve] [Conditional Approve] [Reject]            │
└────────────────────────────────────────────────────────────────┘
```

**Validation Rules**:
- **Approval**: All 5 checkboxes must be checked
- **Conditional Approval**: At least 4 checkboxes checked, notes required
- **Rejection**: At least 1 checkbox unchecked, actionRequired text required
- **Role Check**: Only QC_INSPECTOR or ADMIN can submit

---

### 3. API Routes

#### **POST /api/quality-control/[worksheetId]**
Create or update QC record

**Request Body**:
```typescript
{
  aesthetics: boolean;
  fit: boolean;
  occlusion: boolean;
  shade: boolean;
  margins: boolean;
  result: "APPROVED" | "REJECTED" | "CONDITIONAL";
  notes?: string;
  actionRequired?: string; // Required if result=REJECTED
}
```

**Logic**:
1. Validate user role (QC_INSPECTOR or ADMIN)
2. Validate worksheet is in QC_PENDING status
3. Create/update QualityControl record
4. If APPROVED or CONDITIONAL:
   - Transition worksheet to QC_APPROVED
   - Trigger Annex XIII generation (future task)
5. If REJECTED:
   - Transition worksheet to QC_REJECTED
   - Add actionRequired to worksheet notes
6. Create audit log entry
7. Update order status to match

**Response**:
```typescript
{
  qualityControl: QualityControl;
  worksheet: WorkSheet;
  message: "Quality control completed successfully";
}
```

#### **GET /api/quality-control?status=PENDING**
Get list of QC records with filters

**Query Parameters**:
- `status`: Filter by result (PENDING, APPROVED, REJECTED, CONDITIONAL)
- `inspectorId`: Filter by inspector
- `startDate`, `endDate`: Date range filter

**Response**: Array of QualityControl records with worksheet details

---

### 4. Components

#### **QCDashboard.tsx**
- Table/grid view of pending QC worksheets
- Filters and search
- Statistics cards (pending count, approval rate)

#### **QCInspectionForm.tsx**
- Worksheet details (read-only)
- Interactive checklist (5 checkboxes)
- Notes and action required text areas
- Decision buttons with confirmation dialogs

#### **QCStatusBadge.tsx**
- Visual badge for QC result (PENDING, APPROVED, REJECTED, CONDITIONAL)
- Color coded: gray (pending), green (approved), red (rejected), yellow (conditional)

#### **QCHistory.tsx**
- Timeline of QC events for a worksheet
- Show inspector, date, decision, notes

---

## MDR Compliance Checkpoints

✅ **Traceability**: Inspector ID, inspection date, decision recorded
✅ **Mandatory Gate**: Prevents invoice/document generation without QC approval
✅ **Audit Trail**: All QC actions logged in AuditLog table
✅ **Quality Standards**: 5-point checklist covers EU MDR device requirements
✅ **Rejection Workflow**: Documented rework instructions (actionRequired field)
✅ **Role-Based Access**: Only qualified inspectors can perform QC

---

## Implementation Order

### Phase 1: Database & API (30 min)
1. ✅ QualityControl model (already exists)
2. Create QC API routes:
   - POST /api/quality-control/[worksheetId]
   - GET /api/quality-control

### Phase 2: QC Dashboard (45 min)
1. Create `/app/(dashboard)/quality-control/page.tsx`
2. Build QCDashboard component
3. Add filters and search
4. Statistics cards

### Phase 3: Inspection Interface (60 min)
1. Create `/app/(dashboard)/worksheets/[id]/qc/page.tsx`
2. Build QCInspectionForm component
3. Implement checklist UI
4. Decision buttons with validation
5. Confirmation dialogs

### Phase 4: Integration (20 min)
1. Add QC link to worksheet detail page
2. Add QC stats to main dashboard
3. Update worksheet service to handle QC transitions
4. Test complete workflow: Draft → Production → QC → Approved → Invoice

---

## Testing Checklist

- [ ] QC Inspector can see pending worksheets
- [ ] QC Inspector can approve worksheet (all checkboxes checked)
- [ ] QC Inspector can conditionally approve (4+ checkboxes, notes required)
- [ ] QC Inspector can reject worksheet (actionRequired required)
- [ ] Approved worksheet transitions to QC_APPROVED
- [ ] Rejected worksheet returns to QC_REJECTED (can go back to IN_PRODUCTION)
- [ ] TECHNICIAN role cannot access QC pages
- [ ] INVOICING role cannot access QC pages
- [ ] Audit logs created for all QC actions
- [ ] Order status updates when QC completes

---

**Total Estimated Time**: 2.5-3 hours
**MDR Compliance**: ✅ Full compliance with Article 10 (traceability) and Annex XIII requirements
**FDI Notation**: Not directly required for QC, but teeth data available for context
