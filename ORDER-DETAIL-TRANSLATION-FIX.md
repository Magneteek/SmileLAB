# Order Detail Page Translation Fix

**Date**: 2026-01-12
**Status**: ✅ COMPLETED

## Summary

Fixed missing translations in the order detail page where "Order #" and status values were showing in English instead of Slovenian.

---

## Issues Fixed

### Issue 1: ❌ Hardcoded "Order" in Page Title
**Location**: `app/[locale]/(dashboard)/orders/[id]/page.tsx` (line 189)

**Problem:**
```tsx
<h1>Order {order.orderNumber}</h1>
// Shows: "Order 001" instead of "Naročilo 001"
```

**Fix:**
```tsx
<h1>{t('orderTitle')} {order.orderNumber}</h1>
// Shows: "Naročilo 001"
```

---

### Issue 2: ❌ Raw Status Values (English)
**Location**: `app/[locale]/(dashboard)/orders/[id]/page.tsx` (line 270)

**Problem:**
```tsx
<Badge>{order.status.replace(/_/g, ' ')}</Badge>
// Shows: "QC APPROVED", "IN PRODUCTION" (raw English)
```

**Fix:**
```tsx
<Badge>{t(`statuses.${order.status}`)}</Badge>
// Shows: "QC odobreno", "V proizvodnji" (Slovenian)
```

---

## Translations Added

### Page Title

**English:**
```json
{
  "orderDetail": {
    "orderTitle": "Order"
  }
}
```

**Slovenian:**
```json
{
  "orderDetail": {
    "orderTitle": "Naročilo"
  }
}
```

---

### Status Translations

**English:**
```json
{
  "orderDetail": {
    "statuses": {
      "PENDING": "Pending",
      "IN_PRODUCTION": "In Production",
      "QC_PENDING": "QC Pending",
      "QC_APPROVED": "QC Approved",
      "INVOICED": "Invoiced",
      "DELIVERED": "Delivered",
      "CANCELLED": "Cancelled"
    }
  }
}
```

**Slovenian:**
```json
{
  "orderDetail": {
    "statuses": {
      "PENDING": "V čakanju",
      "IN_PRODUCTION": "V proizvodnji",
      "QC_PENDING": "Čaka na QC",
      "QC_APPROVED": "QC odobreno",
      "INVOICED": "Fakturirano",
      "DELIVERED": "Dostavljeno",
      "CANCELLED": "Preklicano"
    }
  }
}
```

---

## Before vs After

### Page Title

**Before:**
```
Order 001
Status: QC APPROVED
```

**After (English):**
```
Order 001
Status: QC Approved
```

**After (Slovenian):**
```
Naročilo 001
Status: QC odobreno
```

---

### All Status Values

| Status Code | ❌ Before (Raw) | ✅ After (EN) | ✅ After (SL) |
|-------------|----------------|---------------|---------------|
| PENDING | PENDING | Pending | V čakanju |
| IN_PRODUCTION | IN PRODUCTION | In Production | V proizvodnji |
| QC_PENDING | QC PENDING | QC Pending | Čaka na QC |
| QC_APPROVED | QC APPROVED | QC Approved | QC odobreno |
| INVOICED | INVOICED | Invoiced | Fakturirano |
| DELIVERED | DELIVERED | Delivered | Dostavljeno |
| CANCELLED | CANCELLED | Cancelled | Preklicano |

---

## Files Modified

### 1. `messages/en.json`
**Added:**
- `orderDetail.orderTitle`: "Order"
- `orderDetail.statuses.*`: 7 status translations

### 2. `messages/sl.json`
**Added:**
- `orderDetail.orderTitle`: "Naročilo"
- `orderDetail.statuses.*`: 7 Slovenian status translations

### 3. `app/[locale]/(dashboard)/orders/[id]/page.tsx`
**Changed:**
- Line 189: Added `{t('orderTitle')}` instead of hardcoded "Order"
- Line 270: Changed `{order.status.replace(/_/g, ' ')}` to `{t(\`statuses.${order.status}\`)}`

---

## Impact

### User-Facing Changes
- ✅ Page title now shows "Naročilo 001" in Slovenian
- ✅ All status badges show proper Slovenian translations
- ✅ Consistent with rest of application

### Developer Benefits
- Status translations centralized in translation files
- Easy to add new statuses or modify existing ones
- No hardcoded strings in components

---

## Testing Checklist

- [ ] Navigate to order detail page (any order)
- [ ] Verify page title shows "Naročilo" + order number in Slovenian
- [ ] Verify page title shows "Order" + order number in English
- [ ] Check status badge shows Slovenian text (not "QC APPROVED")
- [ ] Test all status values:
  - [ ] V čakanju (PENDING)
  - [ ] V proizvodnji (IN_PRODUCTION)
  - [ ] Čaka na QC (QC_PENDING)
  - [ ] QC odobreno (QC_APPROVED)
  - [ ] Fakturirano (INVOICED)
  - [ ] Dostavljeno (DELIVERED)
  - [ ] Preklicano (CANCELLED)
- [ ] Switch language to English and verify English translations
- [ ] Verify status badge colors still work correctly

---

## Notes

- Status color mapping remains unchanged (still uses `statusColors` object)
- Translation keys use nested structure: `orderDetail.statuses.{STATUS_NAME}`
- This pattern can be reused for other status displays in the application

---

**Status**: Order detail page fully translated ✅

