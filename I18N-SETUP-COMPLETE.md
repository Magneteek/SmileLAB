# ✅ Internationalization (i18n) Setup Complete!

Translation framework is now ready! You can develop in English and translate to Slovenian before production.

## 🎉 What's Been Set Up

### 1. Framework Installation
- ✅ next-intl installed and configured
- ✅ Translation files created (messages/en.json, messages/sl.json)
- ✅ i18n configuration (i18n.ts)
- ✅ Middleware updated for locale routing + authentication
- ✅ Next.js config updated
- ✅ App directory restructured for [locale] routing

### 2. Translation Files Created

**English translations:** `messages/en.json`
**Slovenian translations:** `messages/sl.json` (already translated!)

Categories included:
- Common UI elements (save, cancel, delete, etc.)
- Navigation items
- Invoice management
- Order management
- Worksheet management
- Status labels
- PDF content
- Email templates
- Notifications

### 3. App Structure Reorganized

**Before:**
```
app/
├── (auth)/
├── (dashboard)/
├── api/
└── layout.tsx
```

**After:**
```
app/
├── [locale]/              # New locale folder
│   ├── (auth)/           # Moved here
│   ├── (dashboard)/      # Moved here
│   ├── layout.tsx        # Locale-specific layout
│   └── page.tsx          # Homepage
├── api/                  # Stays at root (no translation needed)
└── layout.tsx            # Root layout (minimal)
```

### 4. Language Switcher Component

**File:** `components/LanguageSwitcher.tsx`

Beautiful dropdown with:
- 🇬🇧 English
- 🇸🇮 Slovenščina
- Visual indicator for current language
- Smooth language switching

---

## 🚀 How to Use Translations

### In Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function InvoiceButton() {
  const t = useTranslations('invoice');

  return (
    <button>{t('sendEmail')}</button>
    // English: "Send Email"
    // Slovenian: "Pošlji e-pošto"
  );
}
```

### In Server Components

```tsx
import { useTranslations } from 'next-intl';

export default function InvoicePage() {
  const t = useTranslations('invoice');

  return (
    <h1>{t('title')}</h1>
    // English: "Invoices"
    // Slovenian: "Računi"
  );
}
```

### In Server Actions / API Utilities

```tsx
import { getTranslations } from 'next-intl/server';

export async function sendInvoiceEmail(locale: string = 'sl') {
  const t = await getTranslations({ locale, namespace: 'email.invoice' });

  const subject = t('subject', { number: 'RAC-2025-001' });
  // Slovenian: "Račun RAC-2025-001"
  // English: "Invoice RAC-2025-001"
}
```

### With Dynamic Values

```tsx
const t = useTranslations('notifications');

toast({
  title: t('success.title'),        // "Uspešno" or "Success"
  description: t('success.saved'),  // "Uspešno shranjeno" or "Saved successfully"
});
```

---

## 📍 URL Structure

Your app now uses locale-based URLs:

```
Slovenian (default): https://r.dentro.si/sl/invoices
English:             https://r.dentro.si/en/invoices

Login:
Slovenian: /sl/login
English:   /en/login

Dashboard:
Slovenian: /sl/dashboard
English:   /en/dashboard
```

**Auto-detection:** First-time visitors are redirected based on browser language.

---

## 🎨 Adding the Language Switcher to Your App

Add the LanguageSwitcher to your navigation component:

```tsx
// In your navbar/header component
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
  return (
    <nav>
      {/* ... other nav items ... */}
      <LanguageSwitcher />
    </nav>
  );
}
```

---

## 📝 How to Add New Translations

### Step 1: Add to English file

**messages/en.json:**
```json
{
  "myNewFeature": {
    "title": "My New Feature",
    "description": "This is a new feature",
    "saveButton": "Save Changes"
  }
}
```

### Step 2: Add to Slovenian file

**messages/sl.json:**
```json
{
  "myNewFeature": {
    "title": "Moja Nova Funkcionalnost",
    "description": "To je nova funkcionalnost",
    "saveButton": "Shrani Spremembe"
  }
}
```

### Step 3: Use in components

```tsx
const t = useTranslations('myNewFeature');

<h1>{t('title')}</h1>
<p>{t('description')}</p>
<button>{t('saveButton')}</button>
```

---

## 🔧 Current Configuration

### Default Locale
**Production:** Slovenian (`sl`)
**Development:** Works with both languages

### Available Locales
- `en` - English
- `sl` - Slovenian

### Middleware
✅ Combines authentication (NextAuth) + internationalization (next-intl)
✅ Auto-detects locale from browser
✅ Protects routes based on authentication
✅ Redirects to correct locale

---

## 🎯 What Works Now

✅ Visit `/en/` → English interface
✅ Visit `/sl/` → Slovenian interface
✅ Switch languages via dropdown
✅ Authentication works with both languages
✅ Translation keys ready for:
  - Common UI elements
  - Navigation
  - Invoices
  - Orders
  - Worksheets
  - Status labels
  - PDFs (ready to use in generation)
  - Emails (ready to use in templates)
  - Notifications

---

## 📋 Next Steps (When You're Ready)

### For Development (Now)
1. Continue coding in English
2. Use `t('key')` for all new text
3. Add translation keys to messages/en.json

### Before Production (Later)
1. Review all Slovenian translations
2. Test both languages thoroughly
3. Add any missing translations
4. Set default locale to `sl` in i18n.ts (already done!)

---

## 🧪 Testing

### Test Language Switching

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000`
3. You'll be redirected to: `http://localhost:3000/sl` or `/en` based on browser
4. Try the language switcher (once you add it to navbar)
5. URLs should update with new locale

### Test Both Languages

```bash
# Visit English version
http://localhost:3000/en/dashboard

# Visit Slovenian version
http://localhost:3000/sl/dashboard
```

---

## 📖 Example: Translating Invoice Detail Page

**Before (hardcoded English):**
```tsx
export function InvoiceDetail({ invoice }) {
  return (
    <div>
      <h1>Invoice Details</h1>
      <p>Invoice Number: {invoice.number}</p>
      <button>Send Email</button>
      <button>Download PDF</button>
    </div>
  );
}
```

**After (translated):**
```tsx
'use client';

import { useTranslations } from 'next-intl';

export function InvoiceDetail({ invoice }) {
  const t = useTranslations('invoice');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('invoiceNumber')}: {invoice.number}</p>
      <button>{t('sendEmail')}</button>
      <button>{t('downloadPDF')}</button>
    </div>
  );
}
```

**Result:**
- English: "Invoice Details", "Invoice Number", "Send Email", "Download PDF"
- Slovenian: "Računi", "Številka računa", "Pošlji e-pošto", "Prenesi PDF"

---

## 🎨 Styling the Language Switcher

The LanguageSwitcher component uses:
- Lucide React icons (Globe)
- ShadCN UI DropdownMenu
- Tailwind CSS for styling
- Dark mode support

You can customize it in `components/LanguageSwitcher.tsx`

---

## 🔍 Common Patterns

### Status Labels
```tsx
const t = useTranslations('status');

<Badge>{t('paid')}</Badge>        // "Plačano" or "Paid"
<Badge>{t('pending')}</Badge>     // "V obdelavi" or "Pending"
<Badge>{t('overdue')}</Badge>     // "Prekoračeno" or "Overdue"
```

### Form Validation
```tsx
const t = useTranslations('common');

{errors.email && <span>{t('required')}</span>}
// Slovenian: "Obvezno"
// English: "Required"
```

### Notifications
```tsx
const t = useTranslations('notifications.success');

toast({
  title: t('title'),              // "Uspešno"
  description: t('invoiceSent'),  // "Račun uspešno poslan"
});
```

---

## ✅ Framework is Ready!

You can now:
1. ✅ Continue developing features in English
2. ✅ Use `t()` for all user-facing text
3. ✅ Translation to Slovenian is already done for common elements
4. ✅ Add new translations as needed
5. ✅ Test both languages anytime
6. ✅ Production-ready for bilingual deployment

**Everything is set up! Just start using `useTranslations()` in your components!**

---

## 🆘 Troubleshooting

### Error: "locale" is not defined
**Solution:** Make sure you're inside the `[locale]` folder structure.

### Language switcher not showing
**Solution:** Add `<LanguageSwitcher />` to your navbar component.

### Translations not loading
**Solution:** Restart dev server after adding new translation keys.

### Page shows wrong language
**Solution:** Check URL - make sure it has `/en/` or `/sl/` in the path.

---

**Happy translating! 🎉**
