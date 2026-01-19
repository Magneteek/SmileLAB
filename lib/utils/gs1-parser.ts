/**
 * GS1-128 Barcode Parser
 *
 * Parses GS1-128 (UCC/EAN-128) barcodes commonly used on medical/dental material packaging.
 *
 * Common Application Identifiers (AI):
 * - (01) GTIN (Product Code) - 14 digits
 * - (10) Batch/LOT Number - Variable (max 20 chars)
 * - (17) Expiry Date - YYMMDD format
 * - (21) Serial Number - Variable (max 20 chars)
 * - (11) Production Date - YYMMDD format
 * - (37) Count/Quantity - Variable
 * - (310n) Net Weight (kg) - Variable with implied decimal
 *
 * Example Barcode:
 * (01)04012345678901(17)251231(10)LOT12345(37)50
 *
 * Extracted:
 * - GTIN: 04012345678901
 * - Expiry: 2025-12-31
 * - LOT: LOT12345
 * - Quantity: 50
 */

export interface GS1ParsedData {
  gtin?: string;           // (01) Product code
  lot?: string;            // (10) Batch/LOT number
  serial?: string;         // (21) Serial number
  expiry?: Date;           // (17) Expiry date (parsed to Date object)
  expiryRaw?: string;      // (17) Raw YYMMDD string
  production?: Date;       // (11) Production date (parsed to Date object)
  productionRaw?: string;  // (11) Raw YYMMDD string
  quantity?: number;       // (37) Count/quantity
  weight?: number;         // (310n) Net weight in kg
  rawData?: string;        // Original barcode string
  applicationIdentifiers?: Record<string, string>; // All AIs found
}

/**
 * Parse GS1-128 barcode string and extract structured data
 *
 * @param barcode - Raw barcode string (e.g., "(01)04012345678901(17)251231(10)LOT12345")
 * @returns Parsed data object with extracted fields
 */
export function parseGS1Barcode(barcode: string): GS1ParsedData {
  if (!barcode || typeof barcode !== 'string') {
    return { rawData: barcode };
  }

  const parsed: GS1ParsedData = {
    rawData: barcode,
    applicationIdentifiers: {},
  };

  // GS1-128 format: (AI)Value(AI)Value...
  // Group separator character (ASCII 29) sometimes used instead of parentheses
  const cleanBarcode = barcode
    .replace(/\x1D/g, '(')  // Replace group separator with (
    .replace(/\]C1/g, '')   // Remove FNC1 indicator if present
    .trim();

  // Extract Application Identifiers using regex
  // Pattern: (AI_CODE)VALUE where AI is 2-4 digits
  const aiPattern = /\((\d{2,4})\)([^(]*)/g;
  let match;

  while ((match = aiPattern.exec(cleanBarcode)) !== null) {
    const ai = match[1];
    const value = match[2].trim();

    // Store all AIs for reference
    if (parsed.applicationIdentifiers) {
      parsed.applicationIdentifiers[ai] = value;
    }

    // Parse specific Application Identifiers
    switch (ai) {
      case '01':
        // GTIN (Global Trade Item Number) - 14 digits
        parsed.gtin = value.substring(0, 14);
        break;

      case '10':
        // Batch/LOT Number - variable length (max 20)
        parsed.lot = value.substring(0, 20);
        break;

      case '21':
        // Serial Number - variable length (max 20)
        parsed.serial = value.substring(0, 20);
        break;

      case '17':
        // Expiry Date - YYMMDD format
        parsed.expiryRaw = value.substring(0, 6);
        parsed.expiry = parseGS1Date(parsed.expiryRaw);
        break;

      case '11':
        // Production Date - YYMMDD format
        parsed.productionRaw = value.substring(0, 6);
        parsed.production = parseGS1Date(parsed.productionRaw);
        break;

      case '37':
        // Count/Quantity - variable length
        const qty = parseInt(value, 10);
        if (!isNaN(qty)) {
          parsed.quantity = qty;
        }
        break;

      case '3100': case '3101': case '3102': case '3103':
      case '3104': case '3105': case '3106': case '3107':
      case '3108': case '3109':
        // Net Weight (kg) with implied decimal
        // Last digit of AI indicates number of decimal places
        const decimals = parseInt(ai.substring(3), 10);
        const weight = parseInt(value, 10);
        if (!isNaN(weight) && !isNaN(decimals)) {
          parsed.weight = weight / Math.pow(10, decimals);
        }
        break;

      // Add more AI parsers as needed
      default:
        // Unknown AI - stored in applicationIdentifiers
        break;
    }
  }

  return parsed;
}

/**
 * Parse GS1 date format (YYMMDD) to JavaScript Date object
 *
 * @param yymmdd - Date string in YYMMDD format (e.g., "251231" for 2025-12-31)
 * @returns Date object or undefined if invalid
 */
export function parseGS1Date(yymmdd: string): Date | undefined {
  if (!yymmdd || yymmdd.length !== 6) {
    return undefined;
  }

  const year = parseInt(yymmdd.substring(0, 2), 10);
  const month = parseInt(yymmdd.substring(2, 4), 10);
  const day = parseInt(yymmdd.substring(4, 6), 10);

  // Validate month and day ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  // Year interpretation: 00-49 = 2000-2049, 50-99 = 1950-1999
  // (Adjust as needed based on your use case)
  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  // Create date object
  const date = new Date(fullYear, month - 1, day);

  // Validate the date is valid (handles invalid dates like Feb 31)
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

/**
 * Format Date object to GS1 date format (YYMMDD)
 *
 * @param date - Date object
 * @returns YYMMDD string or undefined if invalid
 */
export function formatGS1Date(date: Date): string | undefined {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear() % 100; // Get last 2 digits
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
}

/**
 * Validate if a string looks like a GS1-128 barcode
 *
 * @param barcode - String to validate
 * @returns True if string contains GS1 Application Identifiers
 */
export function isGS1Barcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  // Check for presence of Application Identifiers (AI) in parentheses
  const aiPattern = /\(\d{2,4}\)/;
  return aiPattern.test(barcode);
}

/**
 * Extract human-readable summary from parsed GS1 data
 *
 * @param data - Parsed GS1 data
 * @returns Human-readable string summary
 */
export function formatGS1Summary(data: GS1ParsedData): string {
  const parts: string[] = [];

  if (data.lot) {
    parts.push(`LOT: ${data.lot}`);
  }

  if (data.expiry) {
    parts.push(`Expiry: ${data.expiry.toLocaleDateString()}`);
  }

  if (data.quantity) {
    parts.push(`Quantity: ${data.quantity}`);
  }

  if (data.weight) {
    parts.push(`Weight: ${data.weight} kg`);
  }

  if (data.serial) {
    parts.push(`Serial: ${data.serial}`);
  }

  return parts.join(' | ') || 'No data extracted';
}

/**
 * Example usage:
 *
 * ```typescript
 * const barcode = "(01)04012345678901(17)251231(10)LOT12345(37)50";
 * const parsed = parseGS1Barcode(barcode);
 *
 * console.log(parsed);
 * // {
 * //   gtin: "04012345678901",
 * //   lot: "LOT12345",
 * //   expiry: Date(2025-12-31),
 * //   quantity: 50,
 * //   rawData: "(01)04012345678901(17)251231(10)LOT12345(37)50"
 * // }
 *
 * console.log(formatGS1Summary(parsed));
 * // "LOT: LOT12345 | Expiry: 12/31/2025 | Quantity: 50"
 * ```
 */
