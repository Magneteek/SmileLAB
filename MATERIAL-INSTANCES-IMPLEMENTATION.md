# Material Instances Implementation Summary

## Overview
Implemented support for **multiple instances of the same material** per product, with LOT tracking, tooth association, and progressive disclosure UI.

**Use Case**: Bridge on 2 implants - same material (Implant Base) but different LOT numbers for traceability.

---

## ✅ Completed Changes

### 1. Database Schema (`prisma/schema.prisma`)

**Model: `WorksheetProductMaterial`**

**Changes**:
- ✅ Removed `@@unique([worksheetProductId, materialId])` constraint
- ✅ Added `materialLotId String?` (optional LOT reference)
- ✅ Added `materialLot MaterialLot?` relation
- ✅ Added `toothNumber String?` (FDI notation: 11-48, 51-85)
- ✅ Added `notes String?` (clarification per instance)
- ✅ Added `position Int?` (sequence number)
- ✅ Added `@@index([materialLotId])`

**Result**: Allows unlimited instances of same material with different LOTs, teeth, notes.

**Model: `MaterialLot`**

**Changes**:
- ✅ Added reverse relation: `worksheetProductMaterials WorksheetProductMaterial[]`

---

### 2. TypeScript Types (`src/types/worksheet.ts`)

**New Interface**: `ProductMaterialInstance`

```typescript
export interface ProductMaterialInstance {
  materialId: string;
  materialLotId?: string;      // Optional LOT (assign later)
  quantityUsed: number;
  toothNumber?: string;        // Optional FDI notation
  notes?: string;              // Optional clarification
  position?: number;           // Sequence number
}
```

**Updated**: `ProductSelectionData.products[].materials`
- Changed from: `Array<{ materialId, quantityUsed }>`
- Changed to: `ProductMaterialInstance[]`

---

### 3. Service Layer (`lib/services/worksheet-service.ts`)

**Function**: `assignProducts()`

**Changes**:
- ✅ Creates `WorksheetProductMaterial` records with new fields:
  - `materialLotId` (optional)
  - `toothNumber` (optional)
  - `notes` (optional)
  - `position` (auto-increments if not provided)
- ✅ Added detailed console logging for debugging
- ✅ Supports multiple instances (no uniqueness constraint)

**Code**:
```typescript
await tx.worksheetProductMaterial.createMany({
  data: product.materials.map((mat, index) => ({
    worksheetProductId: worksheetProduct.id,
    materialId: mat.materialId,
    materialLotId: mat.materialLotId || null,      // NEW
    quantityUsed: new Decimal(mat.quantityUsed.toString()),
    toothNumber: mat.toothNumber || null,           // NEW
    notes: mat.notes || null,                       // NEW
    position: mat.position ?? index + 1,            // NEW
  })),
});
```

---

### 4. API Validation (`app/api/worksheets/[id]/products/route.ts`)

**Schema**: `assignProductsSchema`

**Changes**:
- ✅ Added `materialLotId: z.string().optional()`
- ✅ Added `toothNumber: z.string().optional()`
- ✅ Added `notes: z.string().optional()`
- ✅ Added `position: z.number().int().optional()`

**Result**: API validates all new fields while keeping them optional.

---

### 5. UI Components

#### **New Component**: `ProductMaterialEditor.tsx`

**Features**:
- ✅ **Progressive Disclosure**: Collapsible sections (Basic view + Expandable details)
- ✅ **LOT Selection**: Dropdown with stock indicators, expiry dates, FIFO ordering
- ✅ **Tooth Association**: FDI notation dropdown (11-48, 51-85)
- ✅ **Notes Field**: Free text for clarification
- ✅ **Duplicate Detection**: Alert dialog warns user before adding duplicate material+LOT
- ✅ **Duplicate Button**: Quick way to duplicate instance with different LOT
- ✅ **Position Management**: Auto-numbering for sequence
- ✅ **Missing LOT Indicator**: Badge shows instances without LOT (amber warning)

**UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ Materials Used (2)     🔶 1 without LOT         │
├─────────────────────────────────────────────────┤
│ 📦 Implant Base - CODE-IB-001   #1  🔶 No LOT  │
│ Quantity: 1 pieces                             │
│ [Expand ▼] [Copy] [X]                          │
│                                                 │
│ 📦 Implant Base - CODE-IB-001   #2              │
│ Quantity: 1 pieces • LOT: LOT-B456 • Tooth: 13  │
│ [Expand ▼] [Copy] [X]                          │
│                                                 │
│ [+ Add material...]                             │
└─────────────────────────────────────────────────┘
```

**Expandable Section** (when clicked):
```
┌─────────────────────────────────────────────────┐
│ LOT Number * [Select LOT ▼]                     │
│ ├─ LOT-A123  (50 pieces • Exp: 2026-06-15)     │
│ ├─ LOT-B456  (30 pieces • Exp: 2026-08-20)     │
│                                                 │
│ Quantity (pieces)  [1    ]                      │
│                                                 │
│ Tooth (FDI Notation)  [Select tooth ▼]         │
│ ├─ No tooth association                         │
│ ├─ Tooth 11                                     │
│ ├─ Tooth 13                                     │
│                                                 │
│ Notes (Optional)                                │
│ [Left implant base                    ]         │
└─────────────────────────────────────────────────┘
```

#### **Updated Component**: `ProductSelector.tsx`

**Changes**:
- ✅ Imported `ProductMaterialInstance` type
- ✅ Imported `ProductMaterialEditor` component
- ✅ Updated `ProductSelection.materials` type to `ProductMaterialInstance[]`
- ✅ Updated props to include:
  - `availableMaterials` (enhanced with `lots[]` array and `availableStock`)
  - `availableTeeth` (string array for FDI notation)
- ✅ Replaced old material editor UI with `<ProductMaterialEditor />`
- ✅ Removed deprecated `updateMaterials()` function

**Integration**:
```tsx
<ProductMaterialEditor
  productId={product.productId}
  productName={product.name || ''}
  materials={product.materials || []}
  availableMaterials={availableMaterials}
  availableTeeth={availableTeeth || []}
  onChange={(materials) => {
    onProductsChange(
      selectedProducts.map((p) =>
        p.productId === product.productId
          ? { ...p, materials }
          : p
      )
    );
  }}
  readOnly={readOnly}
/>
```

---

## 🔄 Remaining Tasks

### 1. **Run Database Migration**

**Command**:
```bash
cd /path/to/dental-lab-mdr
npx prisma migrate dev --name add_lot_tooth_notes_to_product_materials
```

**What it does**:
- Creates migration file
- Updates PostgreSQL database schema
- Generates fresh Prisma Client types

### 2. **Update WorksheetForm Component**

**File**: `src/components/worksheets/WorksheetForm.tsx`

**Changes Needed**:

#### a) Fetch Materials with LOT Data

Currently, `availableMaterials` is fetched without LOT information. Update the API call or query to include:

```typescript
// Example query structure
const materials = await prisma.material.findMany({
  where: { active: true },
  include: {
    lots: {
      where: {
        status: 'AVAILABLE',
        expiryDate: { gte: new Date() }  // Not expired
      },
      orderBy: { arrivalDate: 'asc' }  // FIFO ordering
    }
  }
});

// Transform to match ProductMaterialEditor requirements
const availableMaterials = materials.map(m => ({
  materialId: m.id,
  code: m.code,
  name: m.name,
  unit: m.unit,
  availableStock: m.lots.reduce((sum, lot) => sum + Number(lot.quantityAvailable), 0),
  lots: m.lots.map(lot => ({
    id: lot.id,
    lotNumber: lot.lotNumber,
    quantityAvailable: Number(lot.quantityAvailable),
    expiryDate: lot.expiryDate?.toISOString() || null,
    arrivalDate: lot.arrivalDate.toISOString(),
    status: lot.status
  }))
}));
```

#### b) Pass Available Teeth to ProductSelector

```typescript
// Extract teeth from worksheet
const availableTeeth = selectedTeeth.map(t => t.toothNumber);

// Pass to ProductSelector
<ProductSelector
  selectedProducts={selectedProducts}
  onProductsChange={setSelectedProducts}
  availableMaterials={availableMaterials}  // Enhanced with LOT data
  availableTeeth={availableTeeth}          // NEW
  readOnly={status !== 'DRAFT'}
/>
```

### 3. **Add LOT Validation for DRAFT → IN_PRODUCTION Transition**

**File**: `lib/state-machines/worksheet-state-machine.ts` or `lib/services/worksheet-service.ts`

**Logic**:
```typescript
// Before allowing DRAFT → IN_PRODUCTION transition
async function validateMaterialLots(worksheetId: string) {
  // Get all product-material instances
  const productMaterials = await prisma.worksheetProductMaterial.findMany({
    where: { worksheetProduct: { worksheetId } },
    select: { materialLotId: true, material: { select: { code: true, name: true } } }
  });

  // Find instances without LOT
  const missingLots = productMaterials.filter(pm => !pm.materialLotId);

  if (missingLots.length > 0) {
    throw new Error(
      `Cannot start production: ${missingLots.length} material instance(s) missing LOT assignment. ` +
      `Please assign LOT numbers to all materials before starting production.`
    );
  }
}

// In transitionWorksheetStatus()
if (newStatus === 'IN_PRODUCTION' && worksheet.status === 'DRAFT') {
  await validateMaterialLots(worksheetId);  // Blocking validation
}
```

---

## 📝 Usage Example

### Workflow: 2-Unit Bridge on Implants

1. **Create Worksheet** → DRAFT status
2. **Select Product**: "2-Unit Bridge on Implants"
3. **Add Material Instance 1**:
   - Material: "Implant Base (CODE-IB-001)"
   - LOT: LOT-A123 (or leave blank initially)
   - Tooth: 11
   - Quantity: 1 piece
   - Notes: "Left implant base"

4. **Add Material Instance 2** (duplicate):
   - Material: "Implant Base (CODE-IB-001)" → **Duplicate warning appears**
   - User confirms: "Add Anyway"
   - LOT: LOT-B456
   - Tooth: 13
   - Quantity: 1 piece
   - Notes: "Right implant base"

5. **Add Ceramic Material**:
   - Material: "Ceramic (CODE-CER-005)"
   - LOT: LOT-C789
   - Teeth: (leave blank or add note "11-13")
   - Quantity: 5g
   - Notes: "Bridge span"

6. **Save**: All 3 instances saved to `WorksheetProductMaterial` table

7. **Start Production**: Validation checks all LOTs are assigned → DRAFT → IN_PRODUCTION

---

## 🎯 Benefits

### For Users:
- ✅ **Real-World Workflow**: Matches how dental labs actually work
- ✅ **Clear UI**: Progressive disclosure keeps interface clean
- ✅ **Safety**: Duplicate detection prevents accidental mistakes
- ✅ **Flexibility**: Can assign materials with or without LOT initially

### For EU MDR Compliance:
- ✅ **Full Traceability**: LOT + Tooth + Notes per instance
- ✅ **Forward Traceability**: "Which devices used LOT-A123?"
- ✅ **Reverse Traceability**: "Which LOTs were used in DN-045?"
- ✅ **Validation Gate**: Cannot start production without LOT assignment

### For Development:
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Validation**: Zod schemas at API layer
- ✅ **Debugging**: Comprehensive console logging
- ✅ **Maintainability**: Clean component architecture

---

## 🧪 Testing Checklist

### Functional Tests:
- [ ] Add single material to product
- [ ] Add duplicate material (same material, no LOT) → Confirm warning dialog
- [ ] Add duplicate material with different LOT → Should work without warning
- [ ] Assign LOT to material instance
- [ ] Assign tooth to material instance (FDI notation)
- [ ] Add notes to material instance
- [ ] Duplicate existing instance → Should create copy with cleared LOT
- [ ] Remove material instance
- [ ] Expand/collapse material instance details
- [ ] Save product with materials → Verify database records created
- [ ] Reload worksheet → Verify materials load correctly with all fields

### Edge Cases:
- [ ] Material with no available LOTs → Dropdown shows "No LOTs available"
- [ ] All materials assigned to product → Dropdown shows "All materials assigned"
- [ ] Try to start production with missing LOTs → Should show validation error
- [ ] Read-only mode → All edit controls disabled

### Database Verification:
```sql
-- Check junction table records
SELECT
  wpm.id,
  p.code AS product_code,
  m.code AS material_code,
  ml.lot_number,
  wpm.quantity_used,
  wpm.tooth_number,
  wpm.notes,
  wpm.position
FROM worksheet_product_materials wpm
JOIN worksheet_products wp ON wpm.worksheet_product_id = wp.id
JOIN products p ON wp.product_id = p.id
JOIN materials m ON wpm.material_id = m.id
LEFT JOIN material_lots ml ON wpm.material_lot_id = ml.id
WHERE wp.worksheet_id = 'YOUR_WORKSHEET_ID'
ORDER BY wpm.position;
```

---

## 📊 Database Impact

**Before**:
```
WorksheetProductMaterial
├─ id
├─ worksheetProductId
├─ materialId
├─ quantityUsed
├─ @@unique([worksheetProductId, materialId])  ❌ Blocks duplicates
```

**After**:
```
WorksheetProductMaterial
├─ id
├─ worksheetProductId
├─ materialId
├─ materialLotId        🆕 Optional LOT reference
├─ quantityUsed
├─ toothNumber          🆕 Optional FDI notation
├─ notes                🆕 Optional clarification
├─ position             🆕 Sequence number
├─ @@index([worksheetProductId])
├─ @@index([materialId])
├─ @@index([materialLotId])  🆕
└─ (No unique constraint)    ✅ Allows duplicates
```

**Migration Safety**:
- ✅ All new fields are nullable → No data loss
- ✅ Existing records remain valid
- ✅ Backward compatible (old API calls still work)

---

## 🚀 Deployment Steps

1. **Test in Development**:
   ```bash
   npx prisma migrate dev
   npm run dev
   # Test all workflows
   ```

2. **Create Backup** (Production):
   ```bash
   pg_dump smilelab_mdr > backup_before_material_instances.sql
   ```

3. **Deploy Migration**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Verify Production**:
   - Check database schema
   - Test creating worksheets with material instances
   - Verify LOT validation works
   - Check Annex XIII document generation includes LOT data

---

## 📞 Support

**Issues?**
- Database migration fails → Check PostgreSQL permissions
- TypeScript errors → Run `npx prisma generate` to refresh types
- UI not showing LOT dropdown → Verify `availableMaterials` includes `lots[]` array
- Duplicate detection not working → Check console for errors in `ProductMaterialEditor`

**Questions?**
- LOT assignment strategy → Consult EU MDR Annex XIII requirements
- Tooth association UX → Gather feedback from dental technicians
- Performance with many materials → Add pagination/virtualization if needed

---

**Implementation Status**: ✅ Core features completed, pending integration testing

**Next Steps**: Run migration → Update WorksheetForm → Add LOT validation → Test workflow
