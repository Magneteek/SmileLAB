/**
 * FDI Teeth Notation System Utilities (ISO 3950)
 * Two-digit notation for permanent and primary teeth
 *
 * FDI System:
 * - Permanent teeth: 11-18 (UR), 21-28 (UL), 31-38 (LL), 41-48 (LR)
 * - Primary teeth: 51-55 (UR), 61-65 (UL), 71-75 (LL), 81-85 (LR)
 *
 * First digit = Quadrant
 * Second digit = Position within quadrant
 */

import type { FdiValidationResult } from '@/types/worksheet';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Valid FDI quadrants
 */
export const FDI_QUADRANTS = {
  PERMANENT: {
    UPPER_RIGHT: 1,
    UPPER_LEFT: 2,
    LOWER_LEFT: 3,
    LOWER_RIGHT: 4,
  },
  PRIMARY: {
    UPPER_RIGHT: 5,
    UPPER_LEFT: 6,
    LOWER_LEFT: 7,
    LOWER_RIGHT: 8,
  },
} as const;

/**
 * Maximum tooth positions
 */
export const MAX_POSITIONS = {
  PERMANENT: 8, // 8 teeth per quadrant
  PRIMARY: 5,   // 5 teeth per quadrant
} as const;

/**
 * All valid permanent teeth FDI numbers
 */
export const PERMANENT_TEETH: ReadonlyArray<string> = [
  // Upper right (11-18)
  '11', '12', '13', '14', '15', '16', '17', '18',
  // Upper left (21-28)
  '21', '22', '23', '24', '25', '26', '27', '28',
  // Lower left (31-38)
  '31', '32', '33', '34', '35', '36', '37', '38',
  // Lower right (41-48)
  '41', '42', '43', '44', '45', '46', '47', '48',
] as const;

/**
 * All valid primary teeth FDI numbers
 */
export const PRIMARY_TEETH: ReadonlyArray<string> = [
  // Upper right (51-55)
  '51', '52', '53', '54', '55',
  // Upper left (61-65)
  '61', '62', '63', '64', '65',
  // Lower left (71-75)
  '71', '72', '73', '74', '75',
  // Lower right (81-85)
  '81', '82', '83', '84', '85',
] as const;

/**
 * Tooth position names
 */
export const TOOTH_NAMES: Record<number, string> = {
  1: 'Central Incisor',
  2: 'Lateral Incisor',
  3: 'Canine',
  4: 'First Premolar',
  5: 'Second Premolar',
  6: 'First Molar',
  7: 'Second Molar',
  8: 'Third Molar (Wisdom tooth)',
};

/**
 * Quadrant names
 */
export const QUADRANT_NAMES: Record<number, string> = {
  1: 'Upper Right (Permanent)',
  2: 'Upper Left (Permanent)',
  3: 'Lower Left (Permanent)',
  4: 'Lower Right (Permanent)',
  5: 'Upper Right (Primary)',
  6: 'Upper Left (Primary)',
  7: 'Lower Left (Primary)',
  8: 'Lower Right (Primary)',
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate FDI tooth number
 * @param toothNumber - FDI notation as string (e.g., "11", "26", "55")
 * @returns Validation result with details
 */
export function validateFDI(toothNumber: string): FdiValidationResult {
  // Check if it's a 2-digit string
  if (!/^\d{2}$/.test(toothNumber)) {
    return {
      valid: false,
      toothNumber,
      error: 'FDI number must be exactly 2 digits',
    };
  }

  const quadrant = parseInt(toothNumber[0], 10);
  const position = parseInt(toothNumber[1], 10);

  // Check quadrant (1-8)
  if (quadrant < 1 || quadrant > 8) {
    return {
      valid: false,
      toothNumber,
      error: 'Quadrant must be between 1 and 8',
    };
  }

  const isPermanent = quadrant <= 4;
  const maxPosition = isPermanent ? MAX_POSITIONS.PERMANENT : MAX_POSITIONS.PRIMARY;

  // Check position
  if (position < 1 || position > maxPosition) {
    return {
      valid: false,
      toothNumber,
      error: `Position must be between 1 and ${maxPosition} for ${isPermanent ? 'permanent' : 'primary'} teeth`,
    };
  }

  // Valid FDI number
  return {
    valid: true,
    toothNumber,
    quadrant: quadrant as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
    position,
    isPermanent,
  };
}

/**
 * Check if FDI number is valid (simplified boolean check)
 * @param toothNumber - FDI notation as string
 * @returns true if valid, false otherwise
 */
export function isValidFDI(toothNumber: string): boolean {
  return validateFDI(toothNumber).valid;
}

/**
 * Check if tooth is permanent (vs primary)
 * @param toothNumber - FDI notation as string
 * @returns true if permanent, false if primary
 */
export function isPermanentTooth(toothNumber: string): boolean {
  const result = validateFDI(toothNumber);
  if (!result.valid) return false;
  return result.isPermanent ?? false;
}

/**
 * Check if tooth is primary (deciduous)
 * @param toothNumber - FDI notation as string
 * @returns true if primary, false if permanent
 */
export function isPrimaryTooth(toothNumber: string): boolean {
  const result = validateFDI(toothNumber);
  if (!result.valid) return false;
  return !(result.isPermanent ?? true);
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Get quadrant number from FDI notation
 * @param toothNumber - FDI notation as string
 * @returns Quadrant number (1-8) or null if invalid
 */
export function getQuadrant(toothNumber: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null {
  const result = validateFDI(toothNumber);
  return result.valid ? result.quadrant ?? null : null;
}

/**
 * Get tooth position within quadrant
 * @param toothNumber - FDI notation as string
 * @returns Position (1-8 or 1-5) or null if invalid
 */
export function getToothPosition(toothNumber: string): number | null {
  const result = validateFDI(toothNumber);
  return result.valid ? result.position ?? null : null;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format FDI number with human-readable description
 * @param toothNumber - FDI notation as string
 * @returns Formatted string (e.g., "16 - Upper Right First Molar (Permanent)")
 */
export function formatFDI(toothNumber: string): string {
  const result = validateFDI(toothNumber);

  if (!result.valid) {
    return `${toothNumber} (Invalid FDI notation)`;
  }

  const quadrantName = QUADRANT_NAMES[result.quadrant!] ?? 'Unknown quadrant';
  const positionName = TOOTH_NAMES[result.position!] ?? `Position ${result.position}`;

  return `${toothNumber} - ${positionName} (${quadrantName})`;
}

/**
 * Get short description of tooth
 * @param toothNumber - FDI notation as string
 * @returns Short description (e.g., "Upper Right First Molar")
 */
export function getToothDescription(toothNumber: string): string {
  const result = validateFDI(toothNumber);

  if (!result.valid) {
    return 'Invalid tooth';
  }

  const quadrant = result.quadrant!;
  const position = result.position!;

  // Get position name
  const positionName = TOOTH_NAMES[position] ?? `Position ${position}`;

  // Get simplified quadrant description
  let location = '';
  if (quadrant === 1 || quadrant === 5) location = 'Upper Right';
  else if (quadrant === 2 || quadrant === 6) location = 'Upper Left';
  else if (quadrant === 3 || quadrant === 7) location = 'Lower Left';
  else if (quadrant === 4 || quadrant === 8) location = 'Lower Right';

  return `${location} ${positionName}`;
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple FDI numbers
 * @param toothNumbers - Array of FDI notation strings
 * @returns Array of validation results
 */
export function validateMultipleFDI(toothNumbers: string[]): FdiValidationResult[] {
  return toothNumbers.map(validateFDI);
}

/**
 * Filter valid FDI numbers from a list
 * @param toothNumbers - Array of FDI notation strings
 * @returns Array of valid FDI numbers only
 */
export function filterValidFDI(toothNumbers: string[]): string[] {
  return toothNumbers.filter(isValidFDI);
}

/**
 * Get invalid FDI numbers from a list
 * @param toothNumbers - Array of FDI notation strings
 * @returns Array of invalid FDI numbers with error messages
 */
export function getInvalidFDI(toothNumbers: string[]): Array<{ toothNumber: string; error: string }> {
  return toothNumbers
    .map(validateFDI)
    .filter((result) => !result.valid)
    .map((result) => ({
      toothNumber: result.toothNumber,
      error: result.error ?? 'Unknown error',
    }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all valid FDI numbers (permanent + primary)
 * @returns Array of all valid FDI notation strings
 */
export function getAllValidFDI(): string[] {
  return [...PERMANENT_TEETH, ...PRIMARY_TEETH];
}

/**
 * Get FDI numbers for a specific quadrant
 * @param quadrant - Quadrant number (1-8)
 * @returns Array of FDI numbers in that quadrant
 */
export function getFDIByQuadrant(quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): string[] {
  const isPermanent = quadrant <= 4;
  const maxPosition = isPermanent ? MAX_POSITIONS.PERMANENT : MAX_POSITIONS.PRIMARY;

  const numbers: string[] = [];
  for (let position = 1; position <= maxPosition; position++) {
    numbers.push(`${quadrant}${position}`);
  }

  return numbers;
}

/**
 * Sort FDI numbers in anatomical order
 * @param toothNumbers - Array of FDI notation strings
 * @returns Sorted array (by quadrant, then position)
 */
export function sortFDI(toothNumbers: string[]): string[] {
  return toothNumbers.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
}
