# Barcode Scanning Implementation Guide

**Project**: Smilelab MDR Material LOT Entry
**Feature**: Barcode Scanning for LOT/Serial Number Extraction
**Date**: 2026-01-14

---

## Overview

Medical/dental material suppliers use **GS1-128 barcodes** (also called UCC/EAN-128) on packaging. These barcodes contain structured data that can be automatically extracted, including:

- **LOT Number** (Batch/Lot)
- **Serial Number** (if applicable)
- **Expiry Date**
- **Quantity**
- **Product Code** (GTIN)
- **Manufacturing Date**

---

## What is GS1-128?

### Structure

GS1-128 barcodes use **Application Identifiers (AI)** to structure data:

```
Example Barcode Data:
(01)04012345678901(17)251231(10)LOT12345(37)50

Decoded:
(01) = GTIN (Product Code): 04012345678901
(17) = Expiry Date: 2025-12-31
(10) = Batch/LOT Number: LOT12345
(37) = Count/Quantity: 50 units
```

### Common Application Identifiers (AI)

| AI Code | Meaning | Format | Example |
|---------|---------|--------|---------|
| **01** | GTIN (Product Code) | 14 digits | 04012345678901 |
| **10** | Batch/LOT Number | Variable (max 20 chars) | LOT12345 |
| **17** | Expiry Date | YYMMDD | 251231 → 2025-12-31 |
| **21** | Serial Number | Variable (max 20 chars) | SN987654 |
| **11** | Production Date | YYMMDD | 260114 → 2026-01-14 |
| **37** | Count/Quantity | Variable | 50 |
| **310n** | Net Weight (kg) | Variable | 31021000 → 1.000 kg |

### Real-World Example

**Ivoclar Vivadent Zirconia Packaging**:
```
Barcode: (01)07612997000000(17)271015(10)B2024-10(37)1000
```

**Extracted Data**:
- Product: 07612997000000 (GTIN)
- Expiry: 2027-10-15
- LOT: B2024-10
- Quantity: 1000g

---

## Scanning Methods

### Option A: USB Barcode Scanner (Hardware) ⭐ **RECOMMENDED**

**How It Works**:
- USB barcode scanner acts as **keyboard emulation**
- Scans barcode → types data directly into focused input field
- No special software needed (plug-and-play)

**Advantages**:
- ✅ Instant recognition (no code needed)
- ✅ 99.9% accuracy
- ✅ Very fast (< 1 second)
- ✅ Works with any application
- ✅ No camera quality issues

**Implementation**:
```typescript
// Detect barcode input vs manual typing
const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
  const input = e.currentTarget.value;

  // Barcode scanners type very fast (< 100ms between chars)
  // and often end with Enter key

  if (input.startsWith('(01)') || input.includes('(10)')) {
    // This is likely a GS1-128 barcode
    parseGS1Barcode(input);
  }
};
```

**Hardware Recommendations**:
- **Budget**: Zebra DS2208 (~€80-100) - USB, reliable
- **Professional**: Honeywell Voyager 1450g (~€150-200) - USB, rugged
- **Wireless**: Symbol DS6878 (~€250-350) - Bluetooth, warehouse use

**Setup**:
1. Plug USB scanner into computer
2. Configure to send "Enter" after scan (most do by default)
3. That's it - works immediately!

---

### Option B: Camera Barcode Scanning (Software)

**How It Works**:
- Use device camera to capture barcode image
- JavaScript library decodes barcode in browser
- Extract data from decoded string

**Advantages**:
- ✅ No hardware required (uses phone/tablet camera)
- ✅ Mobile-friendly
- ✅ Works with any barcode format

**Disadvantages**:
- ⚠️ Requires good lighting
- ⚠️ Camera quality dependent
- ⚠️ Slower than hardware scanner (2-3 seconds)
- ⚠️ User must align barcode in frame

**Implementation Libraries**:
```json
{
  "@zxing/library": "^0.20.0",      // Best for barcode scanning
  "react-webcam": "^7.2.0",          // Camera access
  "quagga": "^0.12.1"                // Alternative (older)
}
```

**Code Example**:
```typescript
import { BrowserMultiFormatReader } from '@zxing/library';

const scanner = new BrowserMultiFormatReader();

// Start camera scanning
const result = await scanner.decodeOnceFromVideoDevice(undefined, 'video');
const barcode = result.getText();

// Parse if GS1-128
if (barcode.includes('(01)')) {
  const parsed = parseGS1Barcode(barcode);
  // { lot: 'LOT12345', expiry: '2025-12-31', quantity: 50 }
}
```

---

### Option C: Hybrid Approach ⭐⭐ **BEST OF BOTH WORLDS**

**Implementation**:
1. **Desktop**: Keyboard input detection for USB scanners
2. **Mobile**: Camera button for barcode scanning

**User Experience**:
- Desktop users: Plug in USB scanner, scan barcodes
- Mobile users: Click "Scan Barcode" button, use camera
- Both: Same form, same workflow, different input method

---

## GS1-128 Parser Implementation

### JavaScript Parser

```typescript
interface GS1ParsedData {
  gtin?: string;           // (01) Product code
  lot?: string;            // (10) Batch/LOT number
  serial?: string;         // (21) Serial number
  expiry?: string;         // (17) Expiry date (ISO format)
  production?: string;     // (11) Production date (ISO format)
  quantity?: number;       // (37) Count/quantity
  weight?: number;         // (310n) Net weight
}

function parseGS1Barcode(barcode: string): GS1ParsedData {
  const parsed: GS1ParsedData = {};

  // GS1-128 format: (AI)Value(AI)Value...
  // Group separator character (ASCII 29) sometimes used
  const cleanBarcode = barcode.replace(/\x1D/g, '(');

  // Extract Application Identifiers
  const aiPattern = /\((\d{2,4})\)([^(]+)/g;
  let match;

  while ((match = aiPattern.exec(cleanBarcode)) !== null) {
    const ai = match[1];
    const value = match[2].trim();

    switch (ai) {
      case '01':
        parsed.gtin = value.substring(0, 14);
        break;

      case '10':
        parsed.lot = value.substring(0, 20);
        break;

      case '21':
        parsed.serial = value.substring(0, 20);
        break;

      case '17':
        // YYMMDD format
        parsed.expiry = parseGS1Date(value);
        break;

      case '11':
        // YYMMDD format
        parsed.production = parseGS1Date(value);
        break;

      case '37':
        parsed.quantity = parseInt(value, 10);
        break;

      case '3100': case '3101': case '3102': case '3103':
      case '3104': case '3105':
        // Weight in kg with implied decimal
        const decimals = parseInt(ai.substring(3), 10);
        parsed.weight = parseInt(value, 10) / Math.pow(10, decimals);
        break;
    }
  }

  return parsed;
}

function parseGS1Date(yymmdd: string): string {
  // GS1 dates are YYMMDD
  const year = parseInt(yymmdd.substring(0, 2), 10);
  const month = yymmdd.substring(2, 4);
  const day = yymmdd.substring(4, 6);

  // Assume 2000+ for years 00-50, 1900+ for 51-99
  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  return `${fullYear}-${month}-${day}`;
}
```

### NPM Package (Recommended)

Instead of writing parser from scratch, use existing library:

```bash
npm install gs1-barcode-parser
```

```typescript
import { GS1BarcodeParser } from 'gs1-barcode-parser';

const parser = new GS1BarcodeParser();
const result = parser.parse('(01)04012345678901(17)251231(10)LOT12345');

console.log(result);
// {
//   '01': '04012345678901',
//   '17': '251231',
//   '10': 'LOT12345'
// }

// Then transform to our format:
const lotData = {
  lot: result['10'],
  expiry: parseGS1Date(result['17']),
  gtin: result['01']
};
```

---

## Integration with Quick-Add Modal

### Enhanced Form Component

```typescript
// QuickAddLotModal.tsx
interface QuickAddLotModalProps {
  materialId: string;
  materialName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddLotModal(props: QuickAddLotModalProps) {
  const [scannedData, setScannedData] = useState<GS1ParsedData | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect barcode scanner input (rapid typing + Enter)
  const handleLotNumberInput = (value: string) => {
    if (value.includes('(01)') || value.includes('(10)')) {
      // GS1-128 barcode detected
      const parsed = parseGS1Barcode(value);

      if (parsed.lot) {
        // Auto-fill form fields
        form.setValue('lotNumber', parsed.lot);

        if (parsed.expiry) {
          form.setValue('expiryDate', new Date(parsed.expiry));
        }

        if (parsed.quantity) {
          form.setValue('quantityReceived', parsed.quantity);
        }

        // Show success feedback
        toast({
          title: 'Barcode Scanned',
          description: `LOT: ${parsed.lot} extracted automatically`
        });
      }
    }
  };

  // Camera scanning for mobile
  const handleCameraScan = async () => {
    setShowCameraScanner(true);
    // Open camera scanner modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add LOT - {materialName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* LOT Number Field with barcode detection */}
          <div className="space-y-2">
            <Label>LOT Number</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                {...form.register('lotNumber')}
                placeholder="Type or scan barcode"
                autoFocus
                onInput={(e) => handleLotNumberInput(e.currentTarget.value)}
              />

              {/* Mobile: Camera scan button */}
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCameraScan}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Other fields... */}
        </form>

        {/* Camera Scanner Modal (mobile) */}
        {showCameraScanner && (
          <BarcodeScanner
            onScan={(data) => {
              const parsed = parseGS1Barcode(data);
              // Auto-fill form...
              setShowCameraScanner(false);
            }}
            onClose={() => setShowCameraScanner(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### User Experience Flow

**Desktop with USB Scanner**:
1. Click "+" button on material row
2. Modal opens, LOT field has focus
3. User scans barcode with USB scanner
4. Barcode data types into LOT field
5. System detects GS1 format
6. **Auto-fills**: LOT number, expiry date, quantity
7. User verifies data (can edit if needed)
8. Press Enter → LOT saved

**Mobile with Camera**:
1. Click "+" button on material row
2. Modal opens
3. User clicks camera icon in LOT field
4. Camera opens with barcode frame overlay
5. User aligns barcode, library detects automatically
6. **Auto-fills**: LOT number, expiry date, quantity
7. User verifies data
8. Tap "Save" → LOT saved

---

## Implementation Plan (Updated)

### Phase 1A: Quick-Add Modal + USB Barcode Support (Week 1-2)

**Tasks**:
1. ✅ Create `QuickAddLotModal` component
2. ✅ Add GS1-128 parser utility function
3. ✅ Implement barcode detection on input field
4. ✅ Add auto-fill logic for parsed data
5. ✅ Add action button to `MaterialsTable`
6. ✅ Implement supplier autocomplete
7. ✅ Add keyboard shortcuts
8. ✅ Testing with USB scanner

**Deliverable**: Modal works with manual entry AND USB barcode scanners

### Phase 1B: Camera Barcode Scanner (Week 3)

**Tasks**:
1. ✅ Install `@zxing/library` and `react-webcam`
2. ✅ Create `BarcodeScanner` component (camera interface)
3. ✅ Add camera button to modal (mobile only)
4. ✅ Integrate scanner with modal auto-fill
5. ✅ Add camera permissions handling
6. ✅ Test with real GS1-128 barcodes

**Deliverable**: Mobile users can scan barcodes with camera

---

## Hardware Recommendations

### USB Barcode Scanners (Desktop Use)

**Budget Option** (~€80):
- **Zebra DS2208** - Reliable, plug-and-play
- Reads all 1D barcodes (including GS1-128)
- USB connection
- Durable for daily use

**Professional Option** (~€150):
- **Honeywell Voyager 1450g** - 2D barcode support
- Faster scanning
- More ergonomic design
- Reads damaged/poor quality barcodes

**Wireless Option** (~€250):
- **Symbol DS6878** - Bluetooth connectivity
- 50m wireless range
- Good for warehouse receiving area
- Rechargeable battery

### Mobile Devices (Camera Scanning)

**Recommended**:
- Any modern smartphone (iPhone 11+, Android 9+)
- iPad or Android tablet (better for warehouse use)
- Dedicated rugged tablet if warehouse environment

---

## Testing Checklist

### Manual Testing

**USB Scanner Testing**:
- [ ] Scanner recognized by system (plug in, no drivers needed)
- [ ] Scan real GS1-128 barcode from material packaging
- [ ] Verify LOT number extracted correctly
- [ ] Verify expiry date parsed correctly (YYMMDD → YYYY-MM-DD)
- [ ] Verify quantity extracted (if present)
- [ ] Test with barcodes from different suppliers
- [ ] Test error handling (invalid barcode format)

**Camera Scanner Testing**:
- [ ] Camera permission prompt appears
- [ ] Camera feed displays correctly
- [ ] Barcode detection works (1-3 seconds)
- [ ] Works in various lighting conditions
- [ ] Error handling (permission denied, no camera)
- [ ] Works on iOS Safari and Android Chrome
- [ ] Barcode frame overlay helps alignment

**Edge Cases**:
- [ ] Barcode with missing AI fields (e.g., no expiry)
- [ ] Barcode with extra AI fields (ignore unknown ones)
- [ ] Multiple barcodes on same package (user scans correct one)
- [ ] Barcode partially damaged/readable
- [ ] Manual entry still works if barcode unavailable

---

## Costs Summary

### Software/Development
- **Development Time**: 20-25 hours (including camera support)
- **Libraries**: Free (open-source)
- **No recurring costs**

### Hardware (Optional)
- **USB Scanner**: €80-150 (one-time)
- **Wireless Scanner**: €250-350 (one-time)
- **Mobile Device**: €0 (use existing phones/tablets)

### Total Investment
- **Minimal**: €0 (camera scanning only)
- **Recommended**: €80-150 (1-2 USB scanners)
- **Professional**: €500-700 (2 USB + 1 wireless for warehouse)

---

## Benefits

### Time Savings
- **Manual Entry**: 8-12 seconds to type LOT number
- **USB Scanner**: 1-2 seconds to scan
- **Camera Scanner**: 3-5 seconds to scan
- **Total Time Saved**: 6-10 seconds per LOT × 520 LOTs/year = **52-87 hours/year saved**

### Error Reduction
- **Manual Transcription Errors**: ~5% (typos, misreads)
- **Barcode Scanning Errors**: <0.1% (virtually zero)
- **Compliance Benefit**: Accurate LOT traceability for EU MDR

### User Experience
- Less tedious data entry
- Faster workflow (especially bulk deliveries)
- Professional appearance
- Reduced frustration

---

## Conclusion

**Recommended Approach**: **Hybrid Implementation**

1. **Phase 1A** (Week 1-2): Quick-Add Modal + USB barcode support
   - Works for desktop users with USB scanner
   - Also works manually if no scanner available
   - Cost: €80-150 for scanner(s)

2. **Phase 1B** (Week 3): Add camera barcode scanning
   - Mobile/tablet users can scan with camera
   - No additional hardware needed
   - Cost: €0

**Why This Works**:
- ✅ Supports both desktop (USB) and mobile (camera) workflows
- ✅ No vendor lock-in (works with any GS1-128 barcode)
- ✅ Progressive enhancement (works without scanner too)
- ✅ Best ROI (hardware pays for itself in 2-3 months)
- ✅ Future-proof (camera scanning emerging standard)

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Next Step**: Begin Phase 1A development
