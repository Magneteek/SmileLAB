# Inlay/Onlay Translation Fix

**Date**: 2026-01-12
**Status**: ✅ COMPLETED

## Summary

Fixed incorrect Slovenian translations for "inlay" and "onlay". These terms are used as-is in Slovenian dental practice and should not be translated.

---

## Issue

Inlay and onlay were incorrectly translated to Slovenian words that are completely wrong:
- ❌ "Zasek" (wrong - means "notch" or "indentation")
- ❌ "Nasadek" (wrong - means "attachment" or "insert")

---

## Correction

These are international dental terms used in Slovenian dental practice:
- ✅ **Inlay** - Used as-is in Slovenian
- ✅ **Onlay** - Used as-is in Slovenian

---

## Updated Work Types

| English | Slovenian | Notes |
|---------|-----------|-------|
| Crown | Krona | Translated |
| Bridge | Mostiček | Translated |
| Filling | Polnilo | Translated |
| Implant | Implantat | Translated |
| Denture | Proteza | Translated |
| Veneer | Luska | Translated |
| **Inlay** | **Inlay** | **English term used** |
| **Onlay** | **Onlay** | **English term used** |
| Root Canal | Endodontsko zdravljenje | Translated |
| Extraction | Ekstrakcija | Translated |

---

## Why Keep English Terms?

Some dental terms are international and used across languages:
- **Inlay** - A restoration that fits within the cusps of the tooth
- **Onlay** - A restoration that covers one or more cusps

These are technical terms that Slovenian dentists use in their original English form, similar to how medical terms often remain in Latin or English.

---

## Files Modified

**`messages/sl.json`**

```json
{
  "fdi": {
    "workTypes": {
      "INLAY": "Inlay",   // Was: "Zasek" ❌
      "ONLAY": "Onlay"    // Was: "Nasadek" ❌
    }
  }
}
```

---

**Status**: Inlay and onlay now correctly use English terms ✅

