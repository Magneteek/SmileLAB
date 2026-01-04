# Worksheet Management System - Complete Implementation Plan

**Project**: Smilelab MDR Management System
**Feature**: Worksheet Management with FDI Teeth Selector
**Status**: Not Started (Teeth Selector Partially Complete)
**Priority**: CRITICAL - Core workflow feature
**Complexity**: Very High (Most complex feature in system)

---

## Overview

The Worksheet Management System is the **core workflow** of the dental laboratory, connecting Orders → Materials (FIFO) → Quality Control → Invoicing → MDR Documentation.

### Current Status

**✅ Completed Prerequisites:**
- Database schema (WorkSheet, WorksheetTooth, WorksheetProduct, WorksheetMaterial models)
- Authentication with RBAC
- Order Management system
- Material Inventory with FIFO algorithm
- Pricing List Management
- Dentist/Clinic Management

**⚙️ Partially Complete:**
- FDI Teeth Selector component (created in another session)
  - Location: `/src/components/worksheets/TeethSelector/`
  - 8 files created (TeethSelector.tsx, ToothElement.tsx, WorkTypeSelector.tsx, etc.)

**❌ Not Yet Started:**
- Worksheet service layer
- State machine implementation
- API routes
- UI pages and forms
- Integration with other systems

---

## Architecture Overview

### Data Flow
```
Order (1:1) → WorkSheet
    ↓
WorkSheet has many:
  - WorksheetTooth (FDI notation)
  - WorksheetProduct (from pricing list)
  - WorksheetMaterial (LOT tracking via FIFO)
    ↓
WorkSheet (1:1) → QualityControl
    ↓
WorkSheet (0:1) → Invoice
    ↓
WorkSheet (many) → Documents (Annex XIII)
```

### State Machine Flow
```
DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → INVOICED → DELIVERED
                ↓ (if rejected)
           IN_PRODUCTION (with notes)
```

**Critical Rules:**
- QC approval required before invoice generation
- Annex XIII auto-generated on QC approval
- Material consumption happens when status → IN_PRODUCTION
- Audit logs created on every transition

---

## Implementation Tasks (18 Total)

### Phase 1: Core Infrastructure (5 tasks, 8-10 hours)

#### Task WS-001: Create types/worksheet.ts ✅ READY TO BUILD
**File**: `types/worksheet.ts`
**Lines**: ~120 lines
**Complexity**: Medium
**Dependencies**: None (Prisma schema already exists)

**Requirements:**
```typescript
// Enums
export enum WorksheetStatus {
  DRAFT = 'DRAFT',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QC_PENDING = 'QC_PENDING',
  QC_APPROVED = 'QC_APPROVED',
  QC_REJECTED = 'QC_REJECTED',
  INVOICED = 'INVOICED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum WorkType {
  CROWN = 'CROWN',
  BRIDGE = 'BRIDGE',
  VENEER = 'VENEER',
  DENTURE = 'DENTURE',
  IMPLANT = 'IMPLANT',
  INLAY_ONLAY = 'INLAY_ONLAY',
  FILLING = 'FILLING',
  OTHER = 'OTHER'
}

// DTOs
export interface CreateWorksheetDto {
  orderId: string;
  workDescription: string;
  color?: string;
  shade?: string;
  batchNumber?: string;
}

export interface WorksheetWithRelations {
  // Complete type with all relations
}

export interface TeethSelectionData {
  teeth: Array<{
    fdiNumber: number;
    workType: WorkType;
  }>;
}

export interface ProductSelectionData {
  products: Array<{
    productId: string;
    quantity: number;
    priceAtSelection: Decimal;
  }>;
}

export interface MaterialSelectionData {
  materials: Array<{
    materialId: string;
    quantityNeeded: number;
  }>;
}
```

**Agent**: Direct coding (type definitions)
**Estimated Time**: 1-2 hours

---

#### Task WS-002: Create lib/services/worksheet-service.ts ⚠️ CRITICAL
**File**: `lib/services/worksheet-service.ts`
**Lines**: ~400 lines
**Complexity**: Very High
**Dependencies**: types/worksheet.ts, material-service.ts

**Key Functions:**
```typescript
// 1. Create worksheet from order
export async function createWorksheetFromOrder(
  data: CreateWorksheetDto,
  userId: string
): Promise<Worksheet> {
  // Generate DN-XXX number (sequential)
  // Create worksheet with DRAFT status
  // Link to order (1:1 relationship)
  // Create audit log
}

// 2. Assign teeth with FDI notation
export async function assignTeeth(
  worksheetId: string,
  teethData: TeethSelectionData,
  userId: string
): Promise<void> {
  // Validate FDI numbers (11-48, 51-85)
  // Create WorksheetTooth records
  // Update worksheet
  // Audit log
}

// 3. Assign products from pricing list
export async function assignProducts(
  worksheetId: string,
  productsData: ProductSelectionData,
  userId: string
): Promise<void> {
  // Snapshot current prices (price versioning)
  // Create WorksheetProduct records
  // Calculate total cost
  // Audit log
}

// 4. Assign materials with FIFO LOT selection
export async function assignMaterials(
  worksheetId: string,
  materialsData: MaterialSelectionData,
  userId: string
): Promise<void> {
  // For each material:
  //   - Call material-service.consumeMaterial()
  //   - FIFO algorithm selects oldest LOT
  //   - Deduct quantity from LOT
  //   - Create WorksheetMaterial record (traceability)
  // Audit log
}

// 5. State machine transition
export async function transitionWorksheetStatus(
  worksheetId: string,
  newStatus: WorksheetStatus,
  userId: string,
  notes?: string
): Promise<Worksheet> {
  // Validate transition via state machine
  // Check user permissions
  // Update status
  // Trigger side effects:
  //   - QC_APPROVED → generate Annex XIII
  //   - IN_PRODUCTION → consume materials
  // Audit log
}

// 6. Get worksheets with filters
export async function getWorksheets(
  filters: WorksheetFilters,
  page: number,
  limit: number
): Promise<PaginatedWorksheets> {
  // Filter by status, dentist, date range
  // Include order, dentist, patient
  // Pagination
}

// 7. Traceability queries
export async function getWorksheetMaterials(
  worksheetId: string
): Promise<MaterialTraceability[]> {
  // Reverse traceability: Worksheet → Materials → LOTs
}
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 6-8 hours

---

#### Task WS-003: Create lib/state-machines/worksheet-state-machine.ts ⚠️ CRITICAL
**File**: `lib/state-machines/worksheet-state-machine.ts`
**Lines**: ~200 lines
**Complexity**: High
**Dependencies**: types/worksheet.ts

**State Definitions:**
```typescript
export const WorksheetStateMachine = {
  DRAFT: {
    canTransitionTo: ['IN_PRODUCTION', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    onEnter: [],
    onExit: [],
  },
  IN_PRODUCTION: {
    canTransitionTo: ['QC_PENDING', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    onEnter: ['consumeMaterials'], // Side effect
    onExit: [],
  },
  QC_PENDING: {
    canTransitionTo: ['QC_APPROVED', 'QC_REJECTED'],
    requiredRoles: ['ADMIN', 'QC_INSPECTOR'],
    onEnter: [],
    onExit: [],
  },
  QC_APPROVED: {
    canTransitionTo: ['INVOICED'],
    requiredRoles: ['ADMIN', 'INVOICING'],
    onEnter: ['generateAnnexXIII'], // Side effect
    onExit: [],
  },
  QC_REJECTED: {
    canTransitionTo: ['IN_PRODUCTION', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    onEnter: [],
    onExit: [],
  },
  INVOICED: {
    canTransitionTo: ['DELIVERED'],
    requiredRoles: ['ADMIN', 'INVOICING'],
    onEnter: [],
    onExit: [],
  },
  DELIVERED: {
    canTransitionTo: [],
    requiredRoles: [],
    onEnter: [],
    onExit: [],
  },
  CANCELLED: {
    canTransitionTo: [],
    requiredRoles: [],
    onEnter: [],
    onExit: [],
  },
};

// Validation function
export function canTransition(
  currentStatus: WorksheetStatus,
  newStatus: WorksheetStatus,
  userRole: Role
): { allowed: boolean; reason?: string } {
  // Check if transition is allowed
  // Check user has required role
}

// Get available transitions
export function getAvailableTransitions(
  currentStatus: WorksheetStatus,
  userRole: Role
): WorksheetStatus[] {
  // Return list of statuses user can transition to
}
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 3-4 hours

---

#### Task WS-004: Create lib/utils/fdi-notation.ts
**File**: `lib/utils/fdi-notation.ts`
**Lines**: ~80 lines
**Complexity**: Low
**Dependencies**: None

**Helper Functions:**
```typescript
// Validate FDI number
export function isValidFDI(fdiNumber: number): boolean {
  // Check if number is valid FDI notation
  // Permanent: 11-18, 21-28, 31-38, 41-48
  // Primary: 51-55, 61-65, 71-75, 81-85
}

// Get quadrant
export function getQuadrant(fdiNumber: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  // First digit indicates quadrant
}

// Check if permanent or primary
export function isPermamentTooth(fdiNumber: number): boolean {
  // Permanent: quadrants 1-4
  // Primary: quadrants 5-8
}

// Get tooth position within quadrant
export function getToothPosition(fdiNumber: number): number {
  // Second digit (1-8 or 1-5)
}

// Format for display
export function formatFDI(fdiNumber: number): string {
  // Example: 16 → "16 (Upper right second molar)"
}

// Validate work type for tooth
export function isValidWorkType(
  fdiNumber: number,
  workType: WorkType
): boolean {
  // Some work types not valid for certain teeth
}
```

**Agent**: Direct coding
**Estimated Time**: 1 hour

---

#### Task WS-005: Update TeethSelector integration
**File**: `src/components/worksheets/TeethSelector/` (already exists)
**Lines**: Minor updates
**Complexity**: Low
**Dependencies**: types/worksheet.ts, lib/utils/fdi-notation.ts

**Requirements:**
- Ensure TeethSelector uses types from types/worksheet.ts
- Add FDI validation using fdi-notation.ts utilities
- Export proper data format for worksheet service
- Test integration

**Agent**: Direct coding
**Estimated Time**: 1 hour

---

### Phase 2: API Routes (4 tasks, 6-8 hours)

#### Task WS-006: Create app/api/worksheets/route.ts
**File**: `app/api/worksheets/route.ts`
**Lines**: ~180 lines
**Complexity**: Medium

**Endpoints:**
```typescript
// GET /api/worksheets
export async function GET(req: Request) {
  // Parse query params (status, dentistId, dateRange, page, limit)
  // Call worksheet-service.getWorksheets()
  // Return paginated results
}

// POST /api/worksheets
export async function POST(req: Request) {
  // Validate request body
  // Check permissions (ADMIN, TECHNICIAN)
  // Call worksheet-service.createWorksheetFromOrder()
  // Return created worksheet
}
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 2 hours

---

#### Task WS-007: Create app/api/worksheets/[id]/route.ts
**File**: `app/api/worksheets/[id]/route.ts`
**Lines**: ~150 lines

**Endpoints:**
```typescript
// GET /api/worksheets/:id
// PATCH /api/worksheets/:id (update details, assign teeth/products/materials)
// DELETE /api/worksheets/:id (soft delete - only DRAFT status)
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 2 hours

---

#### Task WS-008: Create app/api/worksheets/[id]/transition/route.ts
**File**: `app/api/worksheets/[id]/transition/route.ts`
**Lines**: ~100 lines

**Endpoint:**
```typescript
// POST /api/worksheets/:id/transition
export async function POST(req: Request) {
  // Get newStatus and notes from body
  // Call worksheet-service.transitionWorksheetStatus()
  // Trigger side effects (Annex XIII generation, etc.)
  // Return updated worksheet
}
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 1.5 hours

---

#### Task WS-009: Create app/api/worksheets/[id]/products/route.ts
**File**: `app/api/worksheets/[id]/products/route.ts`
**Lines**: ~80 lines

**Endpoints:**
```typescript
// POST /api/worksheets/:id/products (assign products)
// DELETE /api/worksheets/:id/products/:productId (remove product)
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 1 hour

---

#### Task WS-010: Create app/api/worksheets/[id]/materials/route.ts
**File**: `app/api/worksheets/[id]/materials/route.ts`
**Lines**: ~80 lines

**Endpoints:**
```typescript
// POST /api/worksheets/:id/materials (assign materials with FIFO)
// DELETE /api/worksheets/:id/materials/:materialId (remove material)
```

**Agent**: `backend-development-specialist`
**Estimated Time**: 1 hour

---

### Phase 3: UI Components (4 tasks, 6-8 hours)

#### Task WS-011: Create components/worksheets/WorksheetForm.tsx
**File**: `components/worksheets/WorksheetForm.tsx`
**Lines**: ~250 lines
**Complexity**: Medium

**Features:**
- Tabs: Details, Teeth, Products, Materials
- Form validation with Zod
- Integration with TeethSelector
- Product selection from pricing list
- Material selection with FIFO indication
- Status display and transition buttons

**Agent**: `ui-component-developer` or `frontend-architect-specialist`
**Estimated Time**: 3-4 hours

---

#### Task WS-012: Create components/worksheets/ProductSelector.tsx
**File**: `components/worksheets/ProductSelector.tsx`
**Lines**: ~150 lines

**Features:**
- Search products from pricing list
- Multi-select with quantities
- Price snapshot display
- Total cost calculation

**Agent**: `ui-component-developer`
**Estimated Time**: 2 hours

---

#### Task WS-013: Create components/worksheets/MaterialSelector.tsx
**File**: `components/worksheets/MaterialSelector.tsx`
**Lines**: ~180 lines

**Features:**
- Browse available materials
- Display available LOTs with FIFO order
- Quantity input
- Show LOT expiry dates
- Low stock warnings

**Agent**: `ui-component-developer`
**Estimated Time**: 2-3 hours

---

#### Task WS-014: Create components/worksheets/WorksheetStatusBadge.tsx
**File**: `components/worksheets/WorksheetStatusBadge.tsx`
**Lines**: ~60 lines

**Features:**
- Color-coded status badges
- Status progress indicator
- Tooltip with status description

**Agent**: Direct coding
**Estimated Time**: 0.5 hour

---

### Phase 4: Pages (4 tasks, 8-10 hours)

#### Task WS-015: Create app/(dashboard)/worksheets/page.tsx
**File**: `app/(dashboard)/worksheets/page.tsx`
**Lines**: ~220 lines

**Features:**
- List view with filters (status, dentist, date)
- Search functionality
- Kanban board view option
- Create new worksheet button

**Agent**: `ui-component-developer` or direct coding
**Estimated Time**: 3 hours

---

#### Task WS-016: Create app/(dashboard)/worksheets/new/page.tsx
**File**: `app/(dashboard)/worksheets/new/page.tsx`
**Lines**: ~150 lines

**Features:**
- Order selection dropdown
- Auto-fill patient/dentist from order
- Initial worksheet form
- Create and redirect to edit

**Agent**: Direct coding
**Estimated Time**: 2 hours

---

#### Task WS-017: Create app/(dashboard)/worksheets/[id]/page.tsx ⚠️ CRITICAL
**File**: `app/(dashboard)/worksheets/[id]/page.tsx`
**Lines**: ~300 lines

**Features:**
- Complete worksheet edit/view
- All tabs: Details, Teeth, Products, Materials
- Status transition controls
- History timeline
- Related documents (Annex XIII, invoices)

**Agent**: `ui-component-developer` or `frontend-architect-specialist`
**Estimated Time**: 4-5 hours

---

#### Task WS-018: Create app/(dashboard)/worksheets/[id]/qc/page.tsx
**File**: `app/(dashboard)/worksheets/[id]/qc/page.tsx`
**Lines**: ~200 lines

**Features:**
- QC checklist interface
- Approve/Reject buttons
- QC notes textarea
- QC history

**Agent**: `ui-component-developer`
**Estimated Time**: 2-3 hours

---

## Implementation Strategy

### Recommended Approach: 3-Phase Build

#### Phase A: Backend Foundation (WS-001 to WS-005)
**Duration**: 1-2 days
**Agent**: `backend-development-specialist` + direct coding

1. Create types (WS-001)
2. Create worksheet service (WS-002) ⚠️ Most critical
3. Create state machine (WS-003)
4. Create FDI utilities (WS-004)
5. Update TeethSelector (WS-005)

**Test**: Can create worksheet, assign teeth, products, materials via service layer

---

#### Phase B: API Layer (WS-006 to WS-010)
**Duration**: 1 day
**Agent**: `backend-development-specialist`

1. Create main API routes (WS-006, WS-007)
2. Create transition API (WS-008)
3. Create products/materials APIs (WS-009, WS-010)

**Test**: Can perform full CRUD via API endpoints

---

#### Phase C: UI Layer (WS-011 to WS-018)
**Duration**: 2-3 days
**Agent**: `ui-component-developer` + `frontend-architect-specialist`

1. Create UI components (WS-011 to WS-014)
2. Create pages (WS-015 to WS-018)

**Test**: Complete end-to-end flow: Order → Worksheet → Teeth → Products → Materials → QC → Invoice

---

## Critical Integration Points

### 1. Material FIFO Integration
**Location**: worksheet-service.ts → assignMaterials()
**Integration**: Calls `material-service.consumeMaterial()`
**Critical**: Must use FIFO algorithm for EU MDR compliance

### 2. State Machine Integration
**Location**: worksheet-service.ts → transitionWorksheetStatus()
**Integration**: Uses `worksheet-state-machine.ts`
**Critical**: Enforces workflow rules, triggers side effects

### 3. TeethSelector Integration
**Location**: WorksheetForm.tsx
**Integration**: Uses existing `TeethSelector` component from `/src/`
**Critical**: Must output correct format for worksheet service

### 4. Price Versioning Integration
**Location**: worksheet-service.ts → assignProducts()
**Integration**: Snapshots current product prices
**Critical**: Historical worksheets must retain original prices

---

## Risk Assessment

### High Risk Items

1. **TeethSelector Component Integration** (WS-005)
   - Risk: Component in different directory structure (`/src/` vs `/`)
   - Mitigation: Test import paths, may need to move/copy component

2. **State Machine Complexity** (WS-003)
   - Risk: Complex transition rules, side effects
   - Mitigation: Comprehensive unit tests for all transitions

3. **Material FIFO Integration** (WS-002)
   - Risk: Transaction failures, quantity tracking errors
   - Mitigation: Wrap in database transactions, extensive testing

4. **Worksheet Form Complexity** (WS-011, WS-017)
   - Risk: Very large component with multiple tabs, many integrations
   - Mitigation: Break into sub-components, use React Hook Form

### Medium Risk Items

1. **Sequential Numbering** (WS-002)
   - Risk: Race conditions with DN-number generation
   - Mitigation: Use database transaction with SystemConfig table (proven pattern from Order system)

2. **Soft Delete Logic** (WS-007)
   - Risk: Only DRAFT worksheets can be deleted
   - Mitigation: Validate status before deletion, use deletedAt field

---

## Testing Strategy

### Unit Tests Required
- `worksheet-service.test.ts` - All service functions
- `worksheet-state-machine.test.ts` - All state transitions
- `fdi-notation.test.ts` - FDI validation utilities

### Integration Tests Required
- `app/api/worksheets.test.ts` - All API endpoints
- Material FIFO integration
- State machine side effects (Annex XIII generation)

### E2E Tests Required
- Complete workflow: Order → Worksheet → QC → Invoice
- Teeth selection and assignment
- Material consumption via FIFO
- Status transitions

---

## Success Criteria

### Functional Requirements
- ✅ Create worksheet from order with DN-XXX numbering
- ✅ Visual FDI teeth selection (11-48, 51-85)
- ✅ Assign products from pricing list with price snapshot
- ✅ Assign materials with FIFO LOT selection
- ✅ State machine workflow with role permissions
- ✅ QC approval/rejection workflow
- ✅ Auto-generate Annex XIII on QC approval
- ✅ Complete audit trail

### Non-Functional Requirements
- ✅ <2 second page load for worksheet list
- ✅ Responsive design (desktop + tablet)
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ 85%+ test coverage

---

## Estimated Timeline

**Total Implementation Time**: 24-30 hours (3-4 days)

- **Phase A (Backend)**: 8-10 hours
- **Phase B (API)**: 6-8 hours
- **Phase C (UI)**: 10-12 hours

**Recommended**: Split across multiple sessions to maintain quality

---

## Next Steps

1. **Decision Point**: Continue in current session or start fresh?
   - Current token usage: 44% used, 56% remaining
   - Recommendation: Can start Phase A (Backend Foundation) now

2. **If starting now**: Begin with WS-001 (types) and WS-002 (service)

3. **If starting fresh**: Use this document as guide for new session

---

**Document Status**: Ready for Implementation
**Created**: 2025-12-26
**Last Updated**: 2025-12-26
