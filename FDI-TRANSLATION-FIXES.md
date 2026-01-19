# FDI Translation Fixes

**Date**: 2026-01-12
**Status**: ✅ COMPLETED

## Summary

Fixed critical translation issues in the FDI teeth selector component where English text and missing translations were showing instead of proper Slovenian translations.

---

## Issues Found

### 1. ❌ English Help Text (Not Translated)
**Location**: `WorkTypeToolbar.tsx` (lines 127-129)

**Problem:**
```tsx
<p>• Click teeth to apply selected work type</p>
<p>• Shift+click to select range of teeth</p>
<p>• Right-click to remove tooth selection</p>
```

Hardcoded English text was showing instead of Slovenian translations.

### 2. ❌ Missing Work Type Translations
**Location**: Translation files

**Problem:**
Two work types were showing as raw translation keys:
- `fdi.workTypes.ROOT_CANAL` instead of "Endodontsko zdravljenje"
- `fdi.workTypes.EXTRACTION` instead of "Ekstrakcija"

### 3. ❌ Inconsistent Translations in Legend
**Location**: `TeethLegend.tsx`

**Problem:**
Legend was using old translation keys (`teethSelector.workType*`) while toolbar was using new keys (`fdi.workTypes.*`), causing inconsistencies:
- Legend: "Mostič" vs Toolbar: "Mostiček"
- Legend: "Luščina" vs Toolbar: "Luska"

---

## Fixes Applied

### Fix 1: Add Missing Translation Keys

**File**: `messages/en.json` and `messages/sl.json`

**Added translations:**

```json
// English (en.json)
{
  "fdi": {
    "workTypes": {
      "ROOT_CANAL": "Root Canal",
      "EXTRACTION": "Extraction"
    },
    "helpClickTeeth": "Click teeth to apply selected work type",
    "helpShiftClick": "Shift+click to select range of teeth",
    "helpRightClick": "Right-click to remove tooth selection"
  }
}

// Slovenian (sl.json)
{
  "fdi": {
    "workTypes": {
      "ROOT_CANAL": "Endodontsko zdravljenje",
      "EXTRACTION": "Ekstrakcija"
    },
    "helpClickTeeth": "Kliknite zobe za uporabo izbranega tipa dela",
    "helpShiftClick": "Shift+klik za izbiro območja zob",
    "helpRightClick": "Desni klik za odstranitev izbire zoba"
  }
}
```

### Fix 2: Update WorkTypeToolbar Component

**File**: `src/components/worksheets/TeethSelector/WorkTypeToolbar.tsx`

**Before (lines 127-129):**
```tsx
<p>• Click teeth to apply selected work type</p>
<p>• Shift+click to select range of teeth</p>
<p>• Right-click to remove tooth selection</p>
```

**After:**
```tsx
<p>• {tFdi('helpClickTeeth')}</p>
<p>• {tFdi('helpShiftClick')}</p>
<p>• {tFdi('helpRightClick')}</p>
```

### Fix 3: Update TeethLegend Component

**File**: `src/components/worksheets/TeethSelector/TeethLegend.tsx`

**Before:**
```tsx
export function TeethLegend({ className, compact = false }: TeethLegendProps) {
  const t = useTranslations();

  const getWorkTypeLabel = (workType: WorkType): string => {
    const labelMap: Record<WorkType, string> = {
      crown: t('teethSelector.workTypeCrown'),
      bridge: t('teethSelector.workTypeBridge'),
      // ... using old keys
    };
    return labelMap[workType];
  };
```

**After:**
```tsx
export function TeethLegend({ className, compact = false }: TeethLegendProps) {
  const t = useTranslations();
  const tWorkTypes = useTranslations('fdi.workTypes');

  const getWorkTypeLabel = (workType: WorkType): string => {
    // Use FDI translation keys (same as toolbar)
    return tWorkTypes(workType.toUpperCase() as any);
  };
```

**Key Changes:**
- Added `tWorkTypes` hook for FDI work type translations
- Simplified `getWorkTypeLabel` to use dynamic key lookup
- Now uses same translation keys as WorkTypeToolbar (consistency!)

---

## Results

### Before (Issues):

**Help Text:**
```
• Click teeth to apply selected work type     ❌ English
• Shift+click to select range of teeth        ❌ English
• Right-click to remove tooth selection       ❌ English
```

**Work Types:**
```
Krona                                          ✅ OK
Mostiček                                       ✅ OK
fdi.workTypes.ROOT_CANAL                       ❌ Missing
fdi.workTypes.EXTRACTION                       ❌ Missing
```

**Legend vs Toolbar:**
```
Legend:  Mostič, Luščina                       ❌ Inconsistent
Toolbar: Mostiček, Luska                       ✅ Correct
```

### After (Fixed):

**Help Text:**
```
• Kliknite zobe za uporabo izbranega tipa dela  ✅ Slovenian
• Shift+klik za izbiro območja zob              ✅ Slovenian
• Desni klik za odstranitev izbire zoba        ✅ Slovenian
```

**Work Types:**
```
Krona                                           ✅ OK
Mostiček                                        ✅ OK
Endodontsko zdravljenje                         ✅ Fixed
Ekstrakcija                                     ✅ Fixed
```

**Legend vs Toolbar:**
```
Legend:  Mostiček, Luska                        ✅ Consistent
Toolbar: Mostiček, Luska                        ✅ Consistent
```

---

## Translation Reference

### Complete FDI Work Types (Slovenian)

| English | Slovenian | Translation Key |
|---------|-----------|----------------|
| Crown | Krona | `fdi.workTypes.CROWN` |
| Bridge | Mostiček | `fdi.workTypes.BRIDGE` |
| Filling | Polnilo | `fdi.workTypes.FILLING` |
| Implant | Implantat | `fdi.workTypes.IMPLANT` |
| Denture | Proteza | `fdi.workTypes.DENTURE` |
| Veneer | Luska | `fdi.workTypes.VENEER` |
| Inlay | Zasek | `fdi.workTypes.INLAY` |
| Onlay | Nasadek | `fdi.workTypes.ONLAY` |
| Root Canal | Endodontsko zdravljenje | `fdi.workTypes.ROOT_CANAL` |
| Extraction | Ekstrakcija | `fdi.workTypes.EXTRACTION` |

### Help Text Translations

| English | Slovenian | Translation Key |
|---------|-----------|----------------|
| Click teeth to apply selected work type | Kliknite zobe za uporabo izbranega tipa dela | `fdi.helpClickTeeth` |
| Shift+click to select range of teeth | Shift+klik za izbiro območja zob | `fdi.helpShiftClick` |
| Right-click to remove tooth selection | Desni klik za odstranitev izbire zoba | `fdi.helpRightClick` |

---

## Files Modified

1. **`messages/en.json`**
   - Added 5 new translation keys (ROOT_CANAL, EXTRACTION, 3 help texts)

2. **`messages/sl.json`**
   - Added 5 new translation keys with Slovenian translations

3. **`src/components/worksheets/TeethSelector/WorkTypeToolbar.tsx`**
   - Changed lines 127-129 to use translation keys
   - Now fully translated, no hardcoded English

4. **`src/components/worksheets/TeethSelector/TeethLegend.tsx`**
   - Updated translation hook usage
   - Changed `getWorkTypeLabel` to use FDI keys
   - Ensured consistency with toolbar translations

---

## Quality Checklist

- ✅ All visible text is translated (no English)
- ✅ All work types have translations (no raw keys)
- ✅ Legend and toolbar use same translation keys (consistent)
- ✅ Help text uses proper Slovenian translations
- ✅ Translation keys follow naming convention (`fdi.*`)
- ✅ Both EN and SL files updated
- ✅ No hardcoded strings in components

---

## Testing Recommendations

1. **Visual Inspection**
   - Open FDI teeth selector in Slovenian locale
   - Verify all work type buttons show Slovenian text
   - Verify help text at bottom is in Slovenian
   - Verify legend shows same translations as toolbar

2. **Translation Completeness**
   - Check all 10 work types display correctly
   - Verify "Endodontsko zdravljenje" appears (not "fdi.workTypes.ROOT_CANAL")
   - Verify "Ekstrakcija" appears (not "fdi.workTypes.EXTRACTION")

3. **Consistency Check**
   - Compare legend work types with toolbar work types
   - Should see "Mostiček" in both (not "Mostič" anywhere)
   - Should see "Luska" in both (not "Luščina" anywhere)

4. **Language Switching**
   - Switch to English locale
   - Verify all text changes to English
   - Switch back to Slovenian
   - Verify all text changes to Slovenian

---

## Technical Notes

### Translation Key Structure

All FDI-related translations use the `fdi.*` namespace:
```
fdi.workTypes.{WORK_TYPE}     - Work type labels
fdi.help{Action}              - Help text
fdi.selectWorkType            - Toolbar header
fdi.clickToSelect             - Toolbar description
fdi.upperJaw                  - Anatomical labels
fdi.lowerJaw                  - Anatomical labels
fdi.teeth.{NUMBER}            - Individual tooth names
```

### Component Translation Pattern

All FDI components now use:
```tsx
const tFdi = useTranslations('fdi');
const tWorkTypes = useTranslations('fdi.workTypes');
```

This ensures all FDI-related components use the same translation namespace for consistency.

---

**Status**: All translation issues resolved ✅

**Related Documentation**: See [FDI-SELECTOR-UX-IMPROVEMENTS.md](./FDI-SELECTOR-UX-IMPROVEMENTS.md) for UX improvements

