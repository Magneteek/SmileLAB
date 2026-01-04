/**
 * FDI Notation Utilities
 *
 * Utilities for validating and working with FDI two-digit tooth notation (ISO 3950)
 *
 * FDI System:
 * - Permanent teeth: 11-18, 21-28, 31-38, 41-48
 * - Primary teeth: 51-55, 61-65, 71-75, 81-85
 */

/**
 * Valid FDI tooth numbers
 */
const PERMANENT_TEETH = [
  // Upper right (1st quadrant)
  11, 12, 13, 14, 15, 16, 17, 18,
  // Upper left (2nd quadrant)
  21, 22, 23, 24, 25, 26, 27, 28,
  // Lower left (3rd quadrant)
  31, 32, 33, 34, 35, 36, 37, 38,
  // Lower right (4th quadrant)
  41, 42, 43, 44, 45, 46, 47, 48,
];

const PRIMARY_TEETH = [
  // Upper right (5th quadrant)
  51, 52, 53, 54, 55,
  // Upper left (6th quadrant)
  61, 62, 63, 64, 65,
  // Lower left (7th quadrant)
  71, 72, 73, 74, 75,
  // Lower right (8th quadrant)
  81, 82, 83, 84, 85,
];

/**
 * All valid FDI tooth numbers
 */
export const VALID_FDI_NUMBERS = [...PERMANENT_TEETH, ...PRIMARY_TEETH];

/**
 * Validate if a tooth number is a valid FDI notation
 */
export function validateFDI(toothNumber: number): boolean {
  return VALID_FDI_NUMBERS.includes(toothNumber);
}

/**
 * Check if tooth is permanent
 */
export function isPermanentTooth(toothNumber: number): boolean {
  return PERMANENT_TEETH.includes(toothNumber);
}

/**
 * Check if tooth is primary (deciduous)
 */
export function isPrimaryTooth(toothNumber: number): boolean {
  return PRIMARY_TEETH.includes(toothNumber);
}

/**
 * Get quadrant number from FDI notation
 * Returns 1-4 for permanent, 5-8 for primary
 */
export function getQuadrant(toothNumber: number): number {
  return Math.floor(toothNumber / 10);
}

/**
 * Get tooth position within quadrant (1-8 for permanent, 1-5 for primary)
 */
export function getToothPosition(toothNumber: number): number {
  return toothNumber % 10;
}

/**
 * Get human-readable tooth name
 */
export function getToothName(toothNumber: number): string {
  const quadrant = getQuadrant(toothNumber);
  const position = getToothPosition(toothNumber);

  const quadrantNames = {
    1: 'Upper Right',
    2: 'Upper Left',
    3: 'Lower Left',
    4: 'Lower Right',
    5: 'Upper Right (Primary)',
    6: 'Upper Left (Primary)',
    7: 'Lower Left (Primary)',
    8: 'Lower Right (Primary)',
  };

  const toothTypes = {
    1: 'Central Incisor',
    2: 'Lateral Incisor',
    3: 'Canine',
    4: 'First Premolar',
    5: 'Second Premolar',
    6: 'First Molar',
    7: 'Second Molar',
    8: 'Third Molar',
  };

  return `${quadrantNames[quadrant as keyof typeof quadrantNames]} ${
    toothTypes[position as keyof typeof toothTypes] || `Tooth ${position}`
  }`;
}
