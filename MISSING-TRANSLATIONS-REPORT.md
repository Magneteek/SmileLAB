# Missing Translations Report

**Date**: 2026-01-12
**Total Missing Keys**: 436 keys used in code but not defined in translation files

## Summary

These translation keys are being used in the codebase via `t('key')` calls but **do not exist** in either `messages/en.json` or `messages/sl.json`.

## Categories of Missing Translations

### 1. Staff Portal & SOP Features (~40 keys)
- `staff.sopLibrary`, `staff.sopLibraryDescription`
- `staff.myTraining`, `staff.trainingHistoryDescription`
- `staff.completed`, `staff.sopsAcknowledged`
- `staff.pendingAcknowledgments`, `staff.sopsRequireAcknowledgment`
- `staff.completedTraining`, `staff.sopsYouAcknowledged`
- `staff.standardOperatingProcedures`, `staff.clickToView`
- `staff.categoryProduction`, `staff.categoryEquipment`, etc.
- **Files**: `app/[locale]/(staff)/**/*.tsx`

### 2. Settings/Configuration (~90 keys)
- `settings.pageTitle`, `settings.pageDescription`
- `settings.labInfoTitle`, `settings.laboratoryName`
- `settings.sectionLabDetails`, `settings.sectionAddress`
- `settings.responsiblePersonName`, `settings.responsiblePersonTitle`
- `settings.logo`, `settings.signature`
- `settings.defaultPaymentTerms`, `settings.defaultTaxRate`
- `settings.bankAccountsTitle`, `settings.addBankAccount`
- **Files**: `app/[locale]/(dashboard)/settings/**/*.tsx`

### 3. Materials Management (~60 keys)
- `materials.createTitle`, `materials.editTitle`
- `materials.lotsFIFOHeader`, `materials.tabLOTs`, `materials.tabStatistics`
- `materials.lotsTableHeaderLOT`, `materials.lotsTableHeaderExpiry`
- `materials.lotsBadgeFirst`, `materials.lotsBadgeExpired`
- `materials.lotsDropdownViewTraceability`, `materials.lotsDropdownAdjustQuantity`
- `materials.statsTotalLOTs`, `materials.statsAvailableLOTs`
- **Files**: `app/[locale]/(dashboard)/materials/**/*.tsx`

### 4. Documents & Reports (~50 keys)
- `documents.subtitle`, `documents.tabs.reports`, `documents.tabs.library`
- `documents.reports.priceList.title`, `documents.reports.priceList.generate`
- `documents.reports.materialList.title`, `documents.reports.outstandingInvoices.title`
- `documents.worksheetDocuments.title`, `documents.worksheetDocuments.generate`
- `documents.library.title`, `documents.library.documentTypes.ANNEX_XIII`
- **Files**: `app/[locale]/(dashboard)/documents/page.tsx`

### 5. Dashboard Widgets (~80 keys)
- `dashboardWidgets.qualityControlTitle`, `dashboardWidgets.totalInspections`
- `dashboardWidgets.ordersOverviewTitle`, `dashboardWidgets.statusBreakdown`
- `dashboardWidgets.mdrDocumentsTitle`, `dashboardWidgets.documentStatus`
- `dashboardWidgets.materialInventoryTitle`, `dashboardWidgets.alertsWarnings`
- `dashboardWidgets.invoicesTitle`, `dashboardWidgets.invoiceStatus`
- **Files**: `components/dashboard/*Widget.tsx`

### 6. Orders Management (~40 keys)
- `orders.priorityNormal`, `orders.priorityHigh`, `orders.priorityUrgent`
- `orders.loadingOrder`, `orders.orderNotFound`
- `orders.editOrderTitle`, `orders.orderInformationTitle`
- `orders.dentistInformationTitle`, `orders.worksheetTitle`
- `orders.createRevisionButton`, `orders.deleteWorksheetConfirm`
- **Files**: `app/[locale]/(dashboard)/orders/**/*.tsx`

### 7. Pricing/Products (~60 keys)
- `pricing.categoryCROWN`, `pricing.categoryBRIDGE`, `pricing.categoryFILLING`
- `pricing.categoryIMPLANT`, `pricing.categoryDENTURE`, etc.
- `pricing.productCodeLabel`, `pricing.productNameLabel`
- `pricing.importTitle`, `pricing.importDescription`
- `pricing.dropZoneTitle`, `pricing.chooseAnother`
- **Files**: `app/[locale]/(dashboard)/pricing/**/*.tsx`

### 8. Common/Shared (~20 keys)
- `common.loading`, `common.yes`, `common.no`
- `common.saving`, `common.cancel`, `common.close`
- `common.edit`, `common.delete`, `common.view`
- **Files**: Multiple components

## Next Steps

1. **Option A: Generate Translations** - Create all 436 missing translations in both English and Slovenian
2. **Option B: Prioritize by Feature** - Complete translations for one feature at a time
3. **Option C: Identify Critical Pages** - Focus on pages you'll test first

## Affected Files (Incomplete Features)

```
app/[locale]/(staff)/
├── staff/sop-library/page.tsx
├── staff/my-training/page.tsx
└── staff/components/*.tsx

app/[locale]/(dashboard)/
├── settings/
│   └── page.tsx (configuration)
├── materials/
│   ├── [id]/page.tsx (material details)
│   ├── [id]/edit/page.tsx
│   └── new/page.tsx
├── documents/
│   └── page.tsx (reports & library)
├── orders/
│   └── [id]/page.tsx (order details)
└── pricing/
    ├── new/page.tsx
    └── [id]/edit/page.tsx

components/
├── dashboard/
│   ├── QualityControlWidget.tsx
│   ├── OrdersOverviewWidget.tsx
│   ├── DocumentsWidget.tsx
│   ├── MaterialAlertsWidget.tsx
│   └── InvoicesWidget.tsx
└── materials/
    └── MaterialLOTsTable.tsx
```

## Recommendation

**Priority Order** (by user impact):
1. Dashboard widgets (user sees first) - 80 keys
2. Settings/configuration (setup required) - 90 keys
3. Staff portal (training compliance) - 40 keys
4. Materials management (LOT tracking) - 60 keys
5. Documents & reports (generation) - 50 keys
6. Orders management - 40 keys
7. Pricing/products - 60 keys
8. Common shared - 20 keys

**Estimated Time**: 3-4 hours to complete all 436 translations (both EN + SL)
