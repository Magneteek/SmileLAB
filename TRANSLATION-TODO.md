# Translation TODO List

Generated: 2026-01-11

## Summary

- **Total EN keys:** 2,008
- **Total SL keys:** 2,071
- **Missing in English:** 63 keys
- **Hardcoded Strings Found:** Multiple dialogs and popups

---

## 🔴 Missing English Translations (63 keys)

These exist in `messages/sl.json` but are missing in `messages/en.json`:

### Staff Portal Section

```json
// Add these to messages/en.json under "staff" section:

"staff": {
  // Library
  "sopLibrary": "SOP Library",
  "sopLibraryDescription": "Review and acknowledge standard operating procedures",
  "totalSOPs": "All SOPs",
  "acknowledged": "Acknowledged",
  "pending": "Pending",

  // Search & Filters
  "searchPlaceholder": "Search by title or code...",
  "allCategories": "All Categories",

  // Content
  "standardOperatingProcedures": "Standard Operating Procedures",
  "clickToView": "Click any SOP to view details and acknowledge",
  "loadingSOPs": "Loading SOPs...",
  "noSOPsFound": "No SOPs found",
  "backToSOPs": "Back to SOPs",
  "downloadPDF": "Download PDF",

  // Actions
  "acknowledge": "Acknowledge",
  "sopNotFound": "SOP not found or unavailable",

  // SOP Details
  "sopInformation": "SOP Information",
  "approvalStatus": "Approval and Status",
  "approvedBy": "Approved by",
  "youAcknowledged": "You acknowledged",
  "sopContent": "SOP Content",
  "readBeforeAcknowledging": "Read and understand this procedure before acknowledging",

  // Acknowledgment Dialog
  "acknowledgeSOP": "Acknowledge SOP",
  "acknowledgeConfirmation": "I confirm that I have read and understood the contents of this standard operating procedure",
  "acknowledgeRecorded": "This acknowledgment will be recorded with a timestamp for compliance purposes.",
  "acknowledging": "Acknowledging...",
  "iAcknowledge": "I Acknowledge",
  "acknowledgedSuccessfully": "SOP successfully acknowledged!",

  // Training
  "myTraining": "My Training",
  "trainingHistoryDescription": "View your SOP acknowledgments and training records",
  "completed": "Completed",
  "sopsAcknowledged": "SOPs Acknowledged",
  "sopsToAcknowledge": "SOPs to Acknowledge",
  "pendingAcknowledgments": "Pending Acknowledgments",
  "sopsRequireAcknowledgment": "SOPs requiring your acknowledgment",
  "viewAndAcknowledge": "View and Acknowledge",
  "completedTraining": "Completed Training",
  "sopsYouAcknowledged": "SOPs you have acknowledged",
  "noSOPsAcknowledged": "You haven't acknowledged any SOPs yet",
  "acknowledgedOn": "Acknowledged on",

  // Categories
  "categoryProduction": "Production",
  "categoryEquipment": "Equipment",
  "categoryMaterial": "Material",
  "categoryQuality": "Quality",
  "categoryDocumentation": "Documentation",
  "categoryPersonnel": "Personnel",
  "categoryRiskManagement": "Risk Management",
  "categoryOther": "Other",

  // Table Headers
  "code": "Code",
  "title": "Title",
  "category": "Category",
  "version": "Version",
  "status": "Status",
  "actions": "Actions",
  "view": "View",
  "loading": "Loading...",

  // Bulk Actions
  "selectAll": "Select All",
  "acknowledgeSelected": "Acknowledge Selected ({count})",
  "bulkAcknowledgeSuccess": "Successfully acknowledged: {count}, already acknowledged: {skipped}",
  "bulkAcknowledgeError": "Bulk acknowledgment failed"
}
```

### Invoices Section

```json
// Add to messages/en.json under "invoices":
"statusCancelled": "Cancelled"
```

### SOP Detail Page

```json
// Add to messages/en.json under "sop.detailPage":
"staffAcknowledgments": "Staff Acknowledgments",
"staffAcknowledgmentsDescription": "{count} staff members have acknowledged this SOP",
"acknowledgedOn": "Acknowledged on"
```

---

## 🔴 Hardcoded Strings in Dialogs/Popups

These need to be converted to use translation keys:

### 1. Staff SOP Acknowledgment Dialog
**File:** `app/[locale]/(staff)/staff/sops/[id]/page.tsx`

**Hardcoded:**
```tsx
<AlertDialogTitle>Acknowledge SOP</AlertDialogTitle>
<AlertDialogDescription>
  I confirm that I have read and understood...
</AlertDialogDescription>
<AlertDialogCancel>Cancel</AlertDialogCancel>
<AlertDialogAction>I Acknowledge</AlertDialogAction>
```

**Should be:**
```tsx
<AlertDialogTitle>{t('staff.acknowledgeSOP')}</AlertDialogTitle>
<AlertDialogDescription>
  {t('staff.acknowledgeConfirmation')}
</AlertDialogDescription>
<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
<AlertDialogAction>{t('staff.iAcknowledge')}</AlertDialogAction>
```

### 2. Pricing Product Delete Dialog
**File:** `app/[locale]/(dashboard)/pricing/[id]/page.tsx`

**Hardcoded:**
```tsx
<AlertDialogTitle>Delete Product</AlertDialogTitle>
<AlertDialogDescription>
  Are you sure you want to delete this product?...
</AlertDialogDescription>
```

**Needs translations added to:** `messages/en.json` and `messages/sl.json`

```json
// Add to "pricing" section:
"deleteProductTitle": "Delete Product",
"deleteProductMessage": "Are you sure you want to delete this product? This action cannot be undone.",
"deleting": "Deleting...",
"deleteSuccess": "Product deleted successfully",
"deleteError": "Failed to delete product"
```

### 3. Common Dialog Buttons

These appear throughout the app and need translation:

**Common buttons needing translation:**
- "Cancel" / "Prekliči"
- "Confirm" / "Potrdi"
- "Delete" / "Izbriši"
- "Save" / "Shrani"
- "Close" / "Zapri"
- "Edit" / "Uredi"
- "Add" / "Dodaj"
- "Remove" / "Odstrani"

**Add to both translation files:**
```json
"common": {
  "cancel": "Cancel",         // "Prekliči"
  "confirm": "Confirm",       // "Potrdi"
  "delete": "Delete",         // "Izbriši"
  "save": "Save",            // "Shrani"
  "close": "Close",          // "Zapri"
  "edit": "Edit",            // "Uredi"
  "add": "Add",              // "Dodaj"
  "remove": "Remove",        // "Odstrani"
  "yes": "Yes",              // "Da"
  "no": "No",                // "Ne"
  "ok": "OK",                // "V redu"
  "back": "Back",            // "Nazaj"
  "next": "Next",            // "Naprej"
  "previous": "Previous",    // "Prejšnji"
  "submit": "Submit",        // "Pošlji"
  "loading": "Loading...",   // "Nalaganje..."
  "error": "Error",          // "Napaka"
  "success": "Success"       // "Uspeh"
}
```

---

## 📋 Files Requiring Translation Updates

Priority order for manual review:

### High Priority (User-Facing Popups)

1. ✅ `app/[locale]/(staff)/staff/sops/[id]/page.tsx`
   - Acknowledgment dialog hardcoded

2. ✅ `app/[locale]/(dashboard)/pricing/[id]/page.tsx`
   - Delete product dialog hardcoded

3. ⚠️ `app/[locale]/(dashboard)/materials/` (all pages)
   - Check for untranslated dialogs

4. ⚠️ `app/[locale]/(dashboard)/dentists/` (all pages)
   - Check for untranslated dialogs

5. ⚠️ `app/[locale]/(dashboard)/worksheets/` (all pages)
   - Check for untranslated dialogs

### Medium Priority (Settings/Admin)

6. ⚠️ `app/[locale]/(dashboard)/settings/` (all pages)
   - Most dialogs are translated, verify completeness

7. ⚠️ `app/[locale]/(dashboard)/quality-control/` (all pages)
   - Check for untranslated content

### Low Priority (Already Translated)

8. ✅ `app/[locale]/(dashboard)/orders/` - Mostly translated
9. ✅ `app/[locale]/(dashboard)/documents/` - Fully translated
10. ✅ `app/[locale]/(dashboard)/settings/sops/` - Mostly translated

---

## 🔧 Quick Action Items

### 1. Add Missing English Keys

**Command:**
```bash
# Open both files side-by-side
code messages/en.json messages/sl.json
```

**Copy the 63 missing keys from above** into `messages/en.json`

### 2. Add Common Dialog Translations

Add the "common" section to both files (see above)

### 3. Fix Hardcoded Dialogs

**Priority 1:** Staff SOP acknowledgment dialog
**Priority 2:** Pricing product delete dialog
**Priority 3:** Scan other pages for hardcoded dialogs

### 4. Verify Implementation

**Test each dialog by:**
1. Switching to Slovenian (`/sl/...`)
2. Opening the dialog/popup
3. Verifying all text is translated
4. Switching to English (`/en/...`)
5. Verifying translations work correctly

---

## 🔍 Manual Review Checklist

Go through each page and check:

- [ ] Page titles
- [ ] Section headings
- [ ] Form labels
- [ ] Button text
- [ ] Placeholder text
- [ ] Error messages
- [ ] Success messages
- [ ] Dialog titles
- [ ] Dialog descriptions
- [ ] Dialog buttons
- [ ] Toast notifications
- [ ] Table headers
- [ ] Empty state messages
- [ ] Loading states

---

## 💡 Tips for Manual Review

1. **Use browser DevTools**: Network tab → Check response headers for locale
2. **Test both languages**: Always switch between `/en/` and `/sl/` routes
3. **Check console**: Look for missing translation warnings
4. **Use the script**: Run `node scripts/find-missing-translations.js` after changes
5. **Document as you go**: Add notes here for any patterns you find

---

## 📝 Notes

- Staff portal (`/staff/*`) has the most missing translations
- Most dialogs in Settings are already translated
- Documents page is fully bilingual
- Common buttons need a shared translation section

---

**Last Updated:** 2026-01-11
**Status:** Ready for manual review
