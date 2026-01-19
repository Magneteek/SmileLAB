# Semantic CSS Classes Guide

## 📋 Overview

All compact sizing is now controlled through semantic CSS classes defined in `app/components.css`.
**No need to edit individual page files** - just replace existing Tailwind classes with semantic ones.

**Base Reference:** Navigation menu (text-sm = 14px)

---

## 🎯 Quick Migration Guide

### Before (Inline Tailwind)
```tsx
<div className="space-y-6">
  <h1 className="text-3xl font-bold">Dashboard</h1>
  <p className="text-muted-foreground">Overview of your system</p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="p-6">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Statistics</CardTitle>
      </CardHeader>
    </Card>
  </div>
</div>
```

### After (Semantic Classes)
```tsx
<div className="page-container">
  <div className="page-header">
    <h1 className="page-title">Dashboard</h1>
    <p className="page-subtitle">Overview of your system</p>
  </div>

  <div className="grid-2-cols">
    <Card className="card-compact">
      <CardHeader className="card-header-compact">
        <CardTitle className="card-title">Statistics</CardTitle>
      </CardHeader>
    </Card>
  </div>
</div>
```

---

## 📚 Class Reference

### Page Layout

| Class | Usage | Size |
|-------|-------|------|
| `.page-container` | Main page wrapper | space-y-4 (16px) |
| `.page-header` | Page header section | mb-4 |
| `.page-title` | Main page heading | text-xl (20px) |
| `.page-subtitle` | Page description | text-sm (14px) |
| `.section-title` | Section headings | text-lg (18px) |
| `.section-subtitle` | Section descriptions | text-sm (14px) |

### Cards & Containers

| Class | Usage | Size |
|-------|-------|------|
| `.card-compact` | Compact card container | p-4, space-y-3 |
| `.card-header-compact` | Card header | space-y-1 |
| `.card-title` | Card title | text-base (16px) |
| `.card-description` | Card description | text-sm (14px) |
| `.card-content` | Card content wrapper | space-y-2 |
| `.card-footer` | Card footer | pt-3, mt-3, border-t |

### Forms

| Class | Usage | Size |
|-------|-------|------|
| `.form-container` | Form wrapper | space-y-4 (16px) |
| `.form-section` | Form sections | space-y-3 (12px) |
| `.form-row` | Two-column form | grid, gap-4 |
| `.form-row-3` | Three-column form | grid, gap-4 |
| `.form-label` | Form labels | text-sm (14px) |
| `.form-description` | Help text | text-xs (12px) |
| `.form-error` | Error messages | text-xs (12px) |

### Buttons

| Class | Usage | Size |
|-------|-------|------|
| `.btn-compact` | Standard buttons | text-sm, py-2, px-3 |
| `.btn-icon-compact` | Icon-only buttons | p-2 |
| `.action-buttons` | Action button group | flex, gap-2, justify-end |

### Tables

| Class | Usage | Size |
|-------|-------|------|
| `.table-container` | Table wrapper | overflow-x-auto |
| `.table-compact` | Table base | text-sm (14px) |
| `.table-header` | Table headers | text-xs (12px) |
| `.table-cell` | Table cells | text-sm, py-2, px-3 |
| `.table-row-hover` | Hover effect | hover:bg-muted/50 |

### Spacing Utilities

| Class | Usage | Vertical | Horizontal |
|-------|-------|----------|------------|
| `.stack-xs` | Extra small | space-y-1 (4px) | - |
| `.stack-sm` | Small | space-y-2 (8px) | - |
| `.stack-md` | Medium | space-y-3 (12px) | - |
| `.stack-lg` | Large | space-y-4 (16px) | - |
| `.inline-xs` | Extra small | - | space-x-1 (4px) |
| `.inline-sm` | Small | - | space-x-2 (8px) |
| `.inline-md` | Medium | - | space-x-3 (12px) |
| `.inline-lg` | Large | - | space-x-4 (16px) |

### Grid Layouts

| Class | Usage | Columns |
|-------|-------|---------|
| `.grid-compact` | Grid with spacing | gap-4 |
| `.grid-2-cols` | Two columns | 1 → 2 (responsive) |
| `.grid-3-cols` | Three columns | 1 → 3 (responsive) |
| `.grid-4-cols` | Four columns | 1 → 2 → 4 (responsive) |

### Text Utilities

| Class | Usage | Size |
|-------|-------|------|
| `.text-heading-lg` | Large headings | text-xl (20px) |
| `.text-heading-md` | Medium headings | text-lg (18px) |
| `.text-heading-sm` | Small headings | text-base (16px) |
| `.text-body` | Body text | text-sm (14px) |
| `.text-caption` | Captions, help text | text-xs (12px) |
| `.text-label` | Labels | text-sm (14px) |

### Dialogs & Modals

| Class | Usage | Size |
|-------|-------|------|
| `.dialog-header-compact` | Dialog header | space-y-1 |
| `.dialog-title` | Dialog title | text-lg (18px) |
| `.dialog-description` | Dialog description | text-sm (14px) |
| `.dialog-content` | Dialog content | space-y-3 |
| `.dialog-footer` | Dialog actions | flex, gap-2, justify-end |

---

## 🔄 Migration Examples

### Example 1: Dashboard Page

**Before:**
```tsx
<div className="space-y-6">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
    <p className="text-muted-foreground">
      Welcome back! Here's what's happening today.
    </p>
  </div>

  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    {/* Cards */}
  </div>
</div>
```

**After:**
```tsx
<div className="page-container">
  <div className="page-header">
    <h1 className="page-title">Dashboard</h1>
    <p className="page-subtitle">
      Welcome back! Here's what's happening today.
    </p>
  </div>

  <div className="grid-4-cols">
    {/* Cards */}
  </div>
</div>
```

### Example 2: Form Page

**Before:**
```tsx
<form className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label className="text-sm font-medium">Name</Label>
      <Input />
      <p className="text-xs text-muted-foreground">Enter full name</p>
    </div>
  </div>

  <div className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </div>
</form>
```

**After:**
```tsx
<form className="form-container">
  <div className="form-row">
    <div className="stack-sm">
      <Label className="form-label">Name</Label>
      <Input />
      <p className="form-description">Enter full name</p>
    </div>
  </div>

  <div className="action-buttons">
    <Button variant="outline" className="btn-compact">Cancel</Button>
    <Button className="btn-compact">Save</Button>
  </div>
</form>
```

### Example 3: Data Table

**Before:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr>
        <th className="text-xs font-semibold uppercase">Name</th>
        <th className="text-xs font-semibold uppercase">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr className="hover:bg-muted/50">
        <td className="py-3 px-4">Item</td>
        <td className="py-3 px-4">Active</td>
      </tr>
    </tbody>
  </table>
</div>
```

**After:**
```tsx
<div className="table-container">
  <table className="table-compact">
    <thead>
      <tr>
        <th className="table-header">Name</th>
        <th className="table-header">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr className="table-row-hover">
        <td className="table-cell">Item</td>
        <td className="table-cell">Active</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Example 4: Dialog/Modal

**Before:**
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader className="space-y-2">
      <AlertDialogTitle className="text-2xl font-bold">
        Delete Item
      </AlertDialogTitle>
      <AlertDialogDescription className="text-sm text-muted-foreground">
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="space-y-4">
      {/* Content */}
    </div>

    <AlertDialogFooter className="flex gap-2">
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**After:**
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader className="dialog-header-compact">
      <AlertDialogTitle className="dialog-title">
        Delete Item
      </AlertDialogTitle>
      <AlertDialogDescription className="dialog-description">
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="dialog-content">
      {/* Content */}
    </div>

    <AlertDialogFooter className="dialog-footer">
      <Button variant="outline" className="btn-compact">Cancel</Button>
      <Button variant="destructive" className="btn-compact">Delete</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 💡 Benefits

1. **Consistency** - All pages use the same sizing automatically
2. **Maintainability** - Change `app/components.css` to update entire app
3. **Readability** - Semantic names are clearer than Tailwind utilities
4. **Responsive** - Built-in responsive behavior in semantic classes
5. **Performance** - Smaller HTML (fewer repeated Tailwind classes)

---

## 🎨 Customization

To adjust sizes globally, edit `app/components.css`:

```css
/* Want tighter spacing? */
.page-container {
  @apply space-y-3; /* Changed from space-y-4 */
}

/* Want larger titles? */
.page-title {
  @apply text-2xl font-bold; /* Changed from text-xl */
}
```

All pages using these classes will update automatically!

---

## 🔍 Find & Replace Guide

Use this to quickly update existing pages:

```bash
# Page titles
text-3xl font-bold → page-title

# Section headings
text-2xl font-semibold → section-title

# Card containers
p-6 → card-compact

# Form spacing
space-y-6 → form-container

# Grid layouts
grid gap-6 md:grid-cols-2 → grid-2-cols

# Button groups
flex justify-end gap-2 → action-buttons
```

---

## ✅ Migration Checklist

- [ ] Import components.css in globals.css (✅ Done!)
- [ ] Test semantic classes work in browser
- [ ] Update one page as a test
- [ ] Verify responsive behavior
- [ ] Update remaining pages gradually
- [ ] Remove old inline Tailwind classes
- [ ] Document any custom patterns

---

**Last Updated:** 2026-01-11
**Location:** `app/components.css`
**Import:** Already imported in `app/globals.css`
