/**
 * FDI Tooth Notation System - Utility Functions
 *
 * This file contains all utility functions for the TeethSelector component:
 * - FDI notation validation
 * - Tooth positioning calculations
 * - Tooth dimension calculations
 * - Helper functions for tooth data manipulation
 */

import type {
  ToothData,
  ToothCoordinates,
  ToothType,
  Quadrant,
  WorkType,
  ValidationResult,
} from './types';
import {
  PERMANENT_TEETH,
  PRIMARY_TEETH,
  TOOTH_DIMENSIONS,
  CANVAS_CONFIG,
  DEFAULT_TOOTH_SIZE,
} from './constants';

/**
 * Validate if a string is a valid FDI tooth number
 *
 * Valid formats:
 * - Permanent: 11-18, 21-28, 31-38, 41-48 (32 teeth)
 * - Primary: 51-55, 61-65, 71-75, 81-85 (20 teeth)
 *
 * @param number - Tooth number to validate
 * @returns True if valid FDI notation
 *
 * @example
 * isValidFDINumber('11') // true
 * isValidFDINumber('51') // true
 * isValidFDINumber('99') // false
 * isValidFDINumber('5') // false (must be 2 digits)
 */
export function isValidFDINumber(number: string): boolean {
  // Must be exactly 2 digits
  if (!/^\d{2}$/.test(number)) {
    return false;
  }

  const quadrant = parseInt(number[0], 10);
  const position = parseInt(number[1], 10);

  // Permanent teeth (quadrants 1-4)
  if (quadrant >= 1 && quadrant <= 4) {
    return position >= 1 && position <= 8;
  }

  // Primary teeth (quadrants 5-8)
  if (quadrant >= 5 && quadrant <= 8) {
    return position >= 1 && position <= 5;
  }

  return false;
}

/**
 * Get tooth data by FDI number
 *
 * @param toothNumber - FDI tooth number (e.g., "11", "51")
 * @returns Tooth data or undefined if not found
 */
export function getToothByNumber(toothNumber: string): ToothData | undefined {
  const allTeeth = [...PERMANENT_TEETH, ...PRIMARY_TEETH];
  return allTeeth.find((tooth) => tooth.number === toothNumber);
}

/**
 * Get all teeth for a specific quadrant
 *
 * @param quadrant - Quadrant number (1-8)
 * @returns Array of teeth in that quadrant
 */
export function getTeethByQuadrant(quadrant: Quadrant): ToothData[] {
  const allTeeth = [...PERMANENT_TEETH, ...PRIMARY_TEETH];
  return allTeeth.filter((tooth) => tooth.quadrant === quadrant);
}

/**
 * Get tooth type from position number
 *
 * @param position - Position within quadrant (1-8)
 * @param isPrimary - Whether this is a primary tooth
 * @returns Tooth type classification
 */
export function getToothType(position: number, isPrimary: boolean): ToothType {
  if (isPrimary) {
    // Primary teeth: positions 1-2 are incisors, 3 is canine, 4-5 are molars
    if (position <= 2) return 'incisor';
    if (position === 3) return 'canine';
    return 'molar';
  }

  // Permanent teeth
  if (position <= 2) return 'incisor';
  if (position === 3) return 'canine';
  if (position <= 5) return 'premolar';
  return 'molar';
}

/**
 * Get tooth dimensions based on type and position
 *
 * Returns anatomically accurate dimensions for realistic rendering
 *
 * @param tooth - Tooth data
 * @returns Width and height in pixels
 */
export function getToothDimensions(tooth: ToothData): {
  width: number;
  height: number;
} {
  switch (tooth.type) {
    case 'incisor':
      // Central incisors are wider than lateral incisors
      if (tooth.position === 1) {
        return TOOTH_DIMENSIONS.incisor.central;
      }
      return TOOTH_DIMENSIONS.incisor.lateral;

    case 'canine':
      return TOOTH_DIMENSIONS.canine;

    case 'premolar':
      return TOOTH_DIMENSIONS.premolar;

    case 'molar':
      return TOOTH_DIMENSIONS.molar;

    default:
      return DEFAULT_TOOTH_SIZE;
  }
}

/**
 * Calculate SVG coordinates for tooth positioning
 *
 * CRITICAL: Dental charts display from clinician's perspective (mirror image)
 * - Quadrant 1 (patient's upper right) appears on LEFT side of UI
 * - Quadrant 2 (patient's upper left) appears on RIGHT side of UI
 *
 * @param tooth - Tooth data
 * @param canvasWidth - SVG canvas width
 * @param canvasHeight - SVG canvas height
 * @returns SVG coordinates and dimensions
 */
export function getToothCoordinates(
  tooth: ToothData,
  canvasWidth: number = CANVAS_CONFIG.width,
  canvasHeight: number = CANVAS_CONFIG.height
): ToothCoordinates {
  const { width, height } = getToothDimensions(tooth);
  const { toothGap, quadrantGap, padding } = CANVAS_CONFIG;

  // Calculate quadrant dimensions
  const quadrantWidth = (canvasWidth - quadrantGap - 2 * padding) / 2;
  const quadrantHeight = (canvasHeight - quadrantGap - 2 * padding) / 2;

  // Determine base quadrant (1-4, mapped from 5-8 for primary)
  const baseQuadrant = tooth.isPrimary ? tooth.quadrant - 4 : tooth.quadrant;

  // Starting position for each quadrant
  let baseX = 0;
  let baseY = 0;

  /**
   * Quadrant positioning (clinician's view - MIRRORED)
   *
   *     ┌──────────┬──────────┐
   *     │ Quad 2   │  Quad 1  │  <- Upper jaw
   *     │ (RIGHT)  │  (LEFT)  │
   *     └──────────┴──────────┘
   *     ┌──────────┬──────────┐
   *     │ Quad 3   │  Quad 4  │  <- Lower jaw
   *     │ (RIGHT)  │  (LEFT)  │
   *     └──────────┴──────────┘
   */
  switch (baseQuadrant) {
    case 1: // Upper right (appears on LEFT side)
      baseX = padding + quadrantWidth / 2;
      baseY = padding + quadrantHeight / 2;
      break;

    case 2: // Upper left (appears on RIGHT side)
      baseX = padding + quadrantWidth + quadrantGap + quadrantWidth / 2;
      baseY = padding + quadrantHeight / 2;
      break;

    case 3: // Lower left (appears on RIGHT side)
      baseX = padding + quadrantWidth + quadrantGap + quadrantWidth / 2;
      baseY = padding + quadrantHeight + quadrantGap + quadrantHeight / 2;
      break;

    case 4: // Lower right (appears on LEFT side)
      baseX = padding + quadrantWidth / 2;
      baseY = padding + quadrantHeight + quadrantGap + quadrantHeight / 2;
      break;
  }

  // Calculate position offset within quadrant
  // All quadrants should show molars first (position 8) to incisors (position 1)
  const teethInQuadrant = tooth.isPrimary ? 5 : 8;
  const totalWidth = teethInQuadrant * width + (teethInQuadrant - 1) * toothGap;
  const startX = -(totalWidth / 2);

  // Reverse order for ALL quadrants so molars (8) appear at the outer edge
  // Q1: 18→11 (left to right), Q2: 28→21 (left to right)
  // Q4: 48→41 (left to right), Q3: 38→31 (left to right)
  const positionForOffset = teethInQuadrant - tooth.position;

  const offset = positionForOffset * (width + toothGap);

  // Calculate final X position
  // Quadrants 1 and 4 (right side) go left from midline
  // Quadrants 2 and 3 (left side) go right from midline
  let finalX: number;
  if (baseQuadrant === 1 || baseQuadrant === 4) {
    finalX = baseX + startX + offset;
  } else {
    finalX = baseX - startX - offset - width;
  }

  // Center Y position (adjust for tooth height)
  const finalY = baseY - height / 2;

  return {
    x: finalX,
    y: finalY,
    width,
    height,
  };
}

/**
 * Validate tooth selection array
 *
 * Checks for:
 * - Valid FDI numbers
 * - No duplicates
 * - Valid work types
 *
 * @param selections - Array of tooth selections
 * @returns Validation result with error message if invalid
 */
export function validateToothSelections(
  selections: Array<{ toothNumber: string; workType: WorkType }>
): ValidationResult {
  // Check for duplicates
  const toothNumbers = selections.map((s) => s.toothNumber);
  const uniqueNumbers = new Set(toothNumbers);

  if (toothNumbers.length !== uniqueNumbers.size) {
    return {
      isValid: false,
      error: 'Duplicate tooth numbers found in selection',
    };
  }

  // Validate each selection
  for (const selection of selections) {
    if (!isValidFDINumber(selection.toothNumber)) {
      return {
        isValid: false,
        error: `Invalid FDI tooth number: ${selection.toothNumber}`,
      };
    }

    if (!selection.workType) {
      return {
        isValid: false,
        error: `Missing work type for tooth ${selection.toothNumber}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Check if a tooth is a wisdom tooth (third molar)
 *
 * @param toothNumber - FDI tooth number
 * @returns True if wisdom tooth (positions 8, 18, 28, 38, 48)
 */
export function isWisdomTooth(toothNumber: string): boolean {
  const tooth = getToothByNumber(toothNumber);
  return tooth?.position === 8 && !tooth?.isPrimary;
}

/**
 * Check if a tooth is a front tooth (incisors or canines)
 *
 * @param toothNumber - FDI tooth number
 * @returns True if front tooth (positions 1-3)
 */
export function isFrontTooth(toothNumber: string): boolean {
  const tooth = getToothByNumber(toothNumber);
  return (tooth?.position ?? 0) <= 3;
}

/**
 * Get adjacent tooth numbers
 *
 * Returns mesial (toward midline) and distal (away from midline) neighbors
 *
 * @param toothNumber - FDI tooth number
 * @returns Object with mesial and distal tooth numbers (undefined if none)
 */
export function getAdjacentTeeth(toothNumber: string): {
  mesial: string | undefined;
  distal: string | undefined;
} {
  const tooth = getToothByNumber(toothNumber);
  if (!tooth) {
    return { mesial: undefined, distal: undefined };
  }

  const maxPosition = tooth.isPrimary ? 5 : 8;

  // Mesial (toward midline) - position decreases
  const mesialPosition = tooth.position - 1;
  const mesial =
    mesialPosition >= 1
      ? `${tooth.quadrant}${mesialPosition}`
      : undefined;

  // Distal (away from midline) - position increases
  const distalPosition = tooth.position + 1;
  const distal =
    distalPosition <= maxPosition
      ? `${tooth.quadrant}${distalPosition}`
      : undefined;

  return { mesial, distal };
}

/**
 * Format tooth number with descriptive name
 *
 * @param toothNumber - FDI tooth number
 * @returns Formatted string (e.g., "11 - Upper Right Central Incisor")
 */
export function formatToothName(toothNumber: string): string {
  const tooth = getToothByNumber(toothNumber);
  if (!tooth) {
    return toothNumber;
  }
  return `${tooth.number} - ${tooth.name}`;
}

/**
 * Group teeth by quadrant
 *
 * @param toothNumbers - Array of FDI tooth numbers
 * @returns Map of quadrant to tooth numbers
 */
export function groupByQuadrant(
  toothNumbers: string[]
): Map<Quadrant, string[]> {
  const grouped = new Map<Quadrant, string[]>();

  for (const toothNumber of toothNumbers) {
    const tooth = getToothByNumber(toothNumber);
    if (!tooth) continue;

    const existing = grouped.get(tooth.quadrant) || [];
    grouped.set(tooth.quadrant, [...existing, toothNumber]);
  }

  return grouped;
}

/**
 * Check if work type is valid
 *
 * @param workType - Work type string to validate
 * @returns True if valid work type
 */
export function isValidWorkType(workType: string): workType is WorkType {
  const validTypes: WorkType[] = [
    'crown',
    'bridge',
    'filling',
    'implant',
    'denture',
    'veneer',
    'inlay',
    'onlay',
    'root_canal',
    'extraction',
  ];
  return validTypes.includes(workType as WorkType);
}

/**
 * Get all permanent teeth numbers
 *
 * @returns Array of all permanent tooth numbers (11-48)
 */
export function getAllPermanentTeethNumbers(): string[] {
  return PERMANENT_TEETH.map((t) => t.number);
}

/**
 * Get all primary teeth numbers
 *
 * @returns Array of all primary tooth numbers (51-85)
 */
export function getAllPrimaryTeethNumbers(): string[] {
  return PRIMARY_TEETH.map((t) => t.number);
}

/**
 * Convert tooth number to quadrant and position
 *
 * @param toothNumber - FDI tooth number
 * @returns Object with quadrant and position, or null if invalid
 */
export function parseToothNumber(toothNumber: string): {
  quadrant: number;
  position: number;
} | null {
  if (!isValidFDINumber(toothNumber)) {
    return null;
  }

  return {
    quadrant: parseInt(toothNumber[0], 10),
    position: parseInt(toothNumber[1], 10),
  };
}

/**
 * Get teeth by type
 *
 * @param type - Tooth type to filter
 * @param isPrimary - Whether to get primary or permanent teeth
 * @returns Array of teeth of specified type
 */
export function getTeethByType(
  type: ToothType,
  isPrimary: boolean = false
): ToothData[] {
  const teeth = isPrimary ? PRIMARY_TEETH : PERMANENT_TEETH;
  return teeth.filter((tooth) => tooth.type === type);
}
