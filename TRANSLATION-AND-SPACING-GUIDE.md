# Translation Management & App Spacing Guide

## 📋 Overview

This guide covers two critical aspects of the Smilelab MDR application:
1. **Translation Management** - How to manage, find, and update translations
2. **App Spacing & Sizing** - Making the app work better on small resolution screens

---

## 🌍 Translation Management

### Current Status

**Translation Analysis:**
- **English keys:** 2,008
- **Slovenian keys:** 2,071
- **Missing in English:** 63 staff-related keys
- **Missing in Slovenian:** 0

### Finding Missing Translations

**Script:** `scripts/find-missing-translations.js`

```bash
# Run the translation analysis
node scripts/find-missing-translations.js
```

This script will:
- Compare EN and SL translation files
- List keys that exist in one language but not the other
- Scan for potential hardcoded strings in TSX files

### Translation File Structure

```
messages/
├── en.json  (English translations)
└── sl.json  (Slovenian translations)
```

**Format:**
```json
{
  "section": {
    "subsection": {
      "key": "Translation value"
    }
  }
}
```

### How to Update Translations

#### 1. Edit Translation Files Directly

**For small changes:**
```bash
# Open the translation files
code messages/en.json messages/sl.json
```

**Example - Adding a new translation:**
```json
// messages/en.json
"documents": {
  "newFeature": {
    "title": "New Feature Title",
    "description": "Feature description"
  }
}

// messages/sl.json
"documents": {
  "newFeature": {
    "title": "Nov naziv funkcije",
    "description": "Opis funkcije"
  }
}
```

#### 2. Fix Missing Staff Translations

The script found 63 keys missing in English. Here's how to add them:

```bash
# Copy the missing keys from SL to EN
# Then translate them to English
```

**Missing Keys (excerpt):**
- `staff.sopLibrary`
- `staff.sopLibraryDescription`
- `staff.totalSOPs`
- `staff.acknowledged`
- `staff.pending`
... (see script output for full list)

#### 3. Using Translations in Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('documents'); // Section name

  return (
    <div>
      <h1>{t('newFeature.title')}</h1>
      <p>{t('newFeature.description')}</p>
    </div>
  );
}
```

### Best Practices

1. **Never hardcode user-facing text** - Always use translations
2. **Keep keys organized** - Use nested structure matching your components
3. **Maintain parity** - Every EN key should have an SL equivalent
4. **Test both languages** - Switch locale to verify translations work
5. **Use descriptive keys** - `reports.priceList.title` not `rpl1`

### Quick Translation Workflow

```bash
# 1. Find missing translations
node scripts/find-missing-translations.js

# 2. Edit translation files
code messages/en.json messages/sl.json

# 3. Add missing keys (copy structure, translate values)

# 4. Verify no errors
npm run build

# 5. Test in browser
# Visit: http://localhost:3210/en/documents
# Visit: http://localhost:3210/sl/documents
```

---

## 📏 App Spacing & Sizing System

### Problem Statement

The app is not user-friendly on small resolution screens. We need to:
- Scale down spacings and font sizes globally
- Use navigation menu size as the base reference
- Maintain visual hierarchy and readability

### Current Navigation Size (Base Reference)

From `components/layout/Sidebar.tsx`:

```tsx
// Navigation items (our base size)
text-sm          // Font size: 14px (0.875rem)
px-3 py-2        // Padding: 12px horizontal, 8px vertical
gap-2            // Gap: 8px (0.5rem)
h-4 w-4          // Icons: 16px (1rem)
```

### Proposed Global Sizing Scale

#### Custom CSS Variables (Add to `app/globals.css`)

```css
@theme inline {
  /* Existing variables... */

  /* Compact Spacing Scale */
  --spacing-xs: 0.25rem;    /* 4px - Minimal spacing */
  --spacing-sm: 0.5rem;     /* 8px - Small spacing (nav gap) */
  --spacing-md: 0.75rem;    /* 12px - Medium spacing (nav horizontal padding) */
  --spacing-lg: 1rem;       /* 16px - Large spacing */
  --spacing-xl: 1.5rem;     /* 24px - Extra large spacing */

  /* Compact Font Size Scale */
  --font-xs: 0.625rem;      /* 10px - Labels, captions */
  --font-sm: 0.75rem;       /* 12px - Small text, secondary */
  --font-base: 0.875rem;    /* 14px - Base text (nav size) */
  --font-md: 1rem;          /* 16px - Emphasis, headings */
  --font-lg: 1.125rem;      /* 18px - Section headings */
  --font-xl: 1.25rem;       /* 20px - Page titles */
  --font-2xl: 1.5rem;       /* 24px - Major headings */
}
```

### Sizing Utility Classes Reference

Based on navigation as "base" (text-sm = 14px):

#### Font Sizes
```
text-xs   (12px)  = -2 from base  → Secondary labels
text-sm   (14px)  = BASE          → Nav items, body text
text-base (16px)  = +2 from base  → Emphasis, card titles
text-lg   (18px)  = +4 from base  → Section headings
text-xl   (20px)  = +6 from base  → Page titles
text-2xl  (24px)  = +10 from base → Major headings
```

#### Spacing (Padding/Margin)
```
p-1  (4px)    → Minimal (badges, tight elements)
p-2  (8px)    → Small (nav vertical, compact cards)
p-3  (12px)   → Base (nav horizontal, form fields)
p-4  (16px)   → Medium (card padding)
p-6  (24px)   → Large (section padding)
```

#### Gaps
```
gap-1  (4px)   → Tight (inline elements)
gap-2  (8px)   → BASE (nav gap, form elements)
gap-3  (12px)  → Medium (card content)
gap-4  (16px)  → Comfortable (sections)
```

### Implementation Strategy

#### Phase 1: Add Global Compact Styles

**Update `app/globals.css`:**

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground text-sm; /* Base font size */
  }

  /* Compact headings */
  h1 {
    @apply text-xl font-bold; /* 20px instead of default 32px */
  }

  h2 {
    @apply text-lg font-semibold; /* 18px instead of default 24px */
  }

  h3 {
    @apply text-base font-semibold; /* 16px instead of default 20px */
  }

  /* Compact form elements */
  input, textarea, select {
    @apply text-sm py-2 px-3; /* Match nav padding */
  }

  button {
    @apply text-sm py-2 px-3; /* Match nav padding */
  }

  /* Compact cards */
  .card {
    @apply p-4; /* 16px instead of 24px */
  }

  /* Compact tables */
  table {
    @apply text-sm; /* Base text size */
  }

  th {
    @apply text-xs font-semibold; /* 12px for headers */
  }
}
```

#### Phase 2: Update Component Spacing

**Priority order:**
1. ✅ Navigation (already done)
2. Dashboard cards and widgets
3. Forms and input fields
4. Tables and data displays
5. Modals and dialogs

**Example - Update a card component:**

**Before:**
```tsx
<Card className="p-6">
  <CardTitle className="text-2xl font-bold mb-4">
    Title
  </CardTitle>
  <CardDescription className="text-base mb-6">
    Description
  </CardDescription>
  <div className="space-y-4">
    ...
  </div>
</Card>
```

**After (Compact):**
```tsx
<Card className="p-4">
  <CardTitle className="text-lg font-bold mb-2">
    Title
  </CardTitle>
  <CardDescription className="text-sm mb-3">
    Description
  </CardDescription>
  <div className="space-y-2">
    ...
  </div>
</Card>
```

**Changes:**
- `p-6` → `p-4` (padding: 24px → 16px)
- `text-2xl` → `text-lg` (title: 24px → 18px)
- `mb-4` → `mb-2` (margin-bottom: 16px → 8px)
- `text-base` → `text-sm` (description: 16px → 14px)
- `mb-6` → `mb-3` (margin-bottom: 24px → 12px)
- `space-y-4` → `space-y-2` (gap: 16px → 8px)

### Conversion Table

| Element Type | Current Default | Compact Size | Tailwind Class |
|-------------|----------------|--------------|----------------|
| Page Title | text-3xl (30px) | text-xl (20px) | `text-xl font-bold` |
| Section Heading | text-2xl (24px) | text-lg (18px) | `text-lg font-semibold` |
| Card Title | text-xl (20px) | text-base (16px) | `text-base font-semibold` |
| Body Text | text-base (16px) | text-sm (14px) | `text-sm` |
| Secondary Text | text-sm (14px) | text-xs (12px) | `text-xs` |
| Card Padding | p-6 (24px) | p-4 (16px) | `p-4` |
| Form Padding | p-4 (16px) | p-3 (12px) | `p-3` |
| Section Gap | gap-6 (24px) | gap-4 (16px) | `gap-4` |
| Element Gap | gap-4 (16px) | gap-2 (8px) | `gap-2` |

### Testing Checklist

After implementing compact spacing:

- [ ] Check all pages at 1366x768 resolution
- [ ] Verify navigation remains comfortable
- [ ] Test forms are still usable
- [ ] Confirm tables display properly
- [ ] Check card layouts don't feel cramped
- [ ] Verify modals/dialogs fit on screen
- [ ] Test mobile responsiveness (if applicable)
- [ ] Ensure text remains readable

### Quick Implementation Script

Create `scripts/compact-spacing.sh`:

```bash
#!/bin/bash

# Find and replace common spacing patterns
# WARNING: Review changes before committing!

# Replace page titles
find app -name "*.tsx" -type f -exec sed -i '' 's/text-3xl/text-xl/g' {} +

# Replace section headings
find app -name "*.tsx" -type f -exec sed -i '' 's/text-2xl font-bold/text-lg font-bold/g' {} +

# Replace card padding
find app -name "*.tsx" -type f -exec sed -i '' 's/className="p-6/className="p-4/g' {} +

echo "✓ Spacing updated. Review changes with: git diff"
```

**Usage:**
```bash
chmod +x scripts/compact-spacing.sh
./scripts/compact-spacing.sh
git diff  # Review all changes
```

### Gradual Rollout Plan

1. **Week 1:** Update globals.css + test dashboard
2. **Week 2:** Update orders, materials, worksheets pages
3. **Week 3:** Update settings, reports, documents pages
4. **Week 4:** Polish, fix issues, gather feedback

---

## 🎯 Quick Reference

### Translation Commands

```bash
# Find missing translations
node scripts/find-missing-translations.js

# Edit translations
code messages/en.json messages/sl.json

# Test specific page
http://localhost:3210/sl/documents
http://localhost:3210/en/documents
```

### Spacing Commands

```bash
# Apply compact spacing (use with caution)
./scripts/compact-spacing.sh

# Review changes
git diff

# Test at small resolution
# Browser: F12 → Device toolbar → 1366x768
```

### Key Files

- **Translations:** `messages/en.json`, `messages/sl.json`
- **Global Styles:** `app/globals.css`
- **Navigation (Reference):** `components/layout/Sidebar.tsx`
- **Scripts:** `scripts/find-missing-translations.js`

---

## 💡 Tips

1. **Always test both languages** after translation changes
2. **Start with globals.css** for spacing - faster than individual components
3. **Use browser DevTools** to test responsive layouts quickly
4. **Create a style guide component** showing all sizes for reference
5. **Document your changes** in git commits for easy reverting

---

## 📞 Need Help?

If you encounter issues:
1. Check TypeScript compilation: `npm run build`
2. Review browser console for errors
3. Test locale switching: `/en/` vs `/sl/`
4. Verify translation keys exist in both files
5. Use DevTools to inspect element spacing
