/**
 * FDI Tooth Notation System - Constants and Configuration
 *
 * This file contains all constant data for the TeethSelector component:
 * - Complete tooth data for all 32 permanent teeth
 * - Complete tooth data for all 20 primary teeth
 * - Color palettes for work types and UI states
 * - Tooth dimensions for anatomically accurate rendering
 * - Canvas configuration
 *
 * @see {@link /deliverables/research/FDI-NOTATION-SYSTEM-RESEARCH.md}
 */

import type {
  ToothData,
  WorkTypeColors,
  ToothColors,
  CanvasConfig,
  ToothDimensions,
} from './types';

/**
 * Complete permanent teeth data (32 teeth)
 * Quadrants 1-4, positions 1-8 each
 */
export const PERMANENT_TEETH: ToothData[] = [
  // QUADRANT 1 - Upper Right (11-18)
  {
    number: '11',
    quadrant: 1,
    position: 1,
    name: 'Upper Right Central Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '12',
    quadrant: 1,
    position: 2,
    name: 'Upper Right Lateral Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '13',
    quadrant: 1,
    position: 3,
    name: 'Upper Right Canine',
    type: 'canine',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '14',
    quadrant: 1,
    position: 4,
    name: 'Upper Right First Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '15',
    quadrant: 1,
    position: 5,
    name: 'Upper Right Second Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '16',
    quadrant: 1,
    position: 6,
    name: 'Upper Right First Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '17',
    quadrant: 1,
    position: 7,
    name: 'Upper Right Second Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '18',
    quadrant: 1,
    position: 8,
    name: 'Upper Right Third Molar (Wisdom)',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'right',
  },

  // QUADRANT 2 - Upper Left (21-28)
  {
    number: '21',
    quadrant: 2,
    position: 1,
    name: 'Upper Left Central Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '22',
    quadrant: 2,
    position: 2,
    name: 'Upper Left Lateral Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '23',
    quadrant: 2,
    position: 3,
    name: 'Upper Left Canine',
    type: 'canine',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '24',
    quadrant: 2,
    position: 4,
    name: 'Upper Left First Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '25',
    quadrant: 2,
    position: 5,
    name: 'Upper Left Second Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '26',
    quadrant: 2,
    position: 6,
    name: 'Upper Left First Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '27',
    quadrant: 2,
    position: 7,
    name: 'Upper Left Second Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '28',
    quadrant: 2,
    position: 8,
    name: 'Upper Left Third Molar (Wisdom)',
    type: 'molar',
    isPrimary: false,
    jaw: 'upper',
    side: 'left',
  },

  // QUADRANT 3 - Lower Left (31-38)
  {
    number: '31',
    quadrant: 3,
    position: 1,
    name: 'Lower Left Central Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '32',
    quadrant: 3,
    position: 2,
    name: 'Lower Left Lateral Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '33',
    quadrant: 3,
    position: 3,
    name: 'Lower Left Canine',
    type: 'canine',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '34',
    quadrant: 3,
    position: 4,
    name: 'Lower Left First Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '35',
    quadrant: 3,
    position: 5,
    name: 'Lower Left Second Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '36',
    quadrant: 3,
    position: 6,
    name: 'Lower Left First Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '37',
    quadrant: 3,
    position: 7,
    name: 'Lower Left Second Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '38',
    quadrant: 3,
    position: 8,
    name: 'Lower Left Third Molar (Wisdom)',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'left',
  },

  // QUADRANT 4 - Lower Right (41-48)
  {
    number: '41',
    quadrant: 4,
    position: 1,
    name: 'Lower Right Central Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '42',
    quadrant: 4,
    position: 2,
    name: 'Lower Right Lateral Incisor',
    type: 'incisor',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '43',
    quadrant: 4,
    position: 3,
    name: 'Lower Right Canine',
    type: 'canine',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '44',
    quadrant: 4,
    position: 4,
    name: 'Lower Right First Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '45',
    quadrant: 4,
    position: 5,
    name: 'Lower Right Second Premolar',
    type: 'premolar',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '46',
    quadrant: 4,
    position: 6,
    name: 'Lower Right First Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '47',
    quadrant: 4,
    position: 7,
    name: 'Lower Right Second Molar',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '48',
    quadrant: 4,
    position: 8,
    name: 'Lower Right Third Molar (Wisdom)',
    type: 'molar',
    isPrimary: false,
    jaw: 'lower',
    side: 'right',
  },
];

/**
 * Complete primary teeth data (20 teeth)
 * Quadrants 5-8, positions 1-5 each
 */
export const PRIMARY_TEETH: ToothData[] = [
  // QUADRANT 5 - Upper Right Primary (51-55)
  {
    number: '51',
    quadrant: 5,
    position: 1,
    name: 'Upper Right Central Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '52',
    quadrant: 5,
    position: 2,
    name: 'Upper Right Lateral Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '53',
    quadrant: 5,
    position: 3,
    name: 'Upper Right Canine (Primary)',
    type: 'canine',
    isPrimary: true,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '54',
    quadrant: 5,
    position: 4,
    name: 'Upper Right First Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'upper',
    side: 'right',
  },
  {
    number: '55',
    quadrant: 5,
    position: 5,
    name: 'Upper Right Second Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'upper',
    side: 'right',
  },

  // QUADRANT 6 - Upper Left Primary (61-65)
  {
    number: '61',
    quadrant: 6,
    position: 1,
    name: 'Upper Left Central Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '62',
    quadrant: 6,
    position: 2,
    name: 'Upper Left Lateral Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '63',
    quadrant: 6,
    position: 3,
    name: 'Upper Left Canine (Primary)',
    type: 'canine',
    isPrimary: true,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '64',
    quadrant: 6,
    position: 4,
    name: 'Upper Left First Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'upper',
    side: 'left',
  },
  {
    number: '65',
    quadrant: 6,
    position: 5,
    name: 'Upper Left Second Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'upper',
    side: 'left',
  },

  // QUADRANT 7 - Lower Left Primary (71-75)
  {
    number: '71',
    quadrant: 7,
    position: 1,
    name: 'Lower Left Central Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '72',
    quadrant: 7,
    position: 2,
    name: 'Lower Left Lateral Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '73',
    quadrant: 7,
    position: 3,
    name: 'Lower Left Canine (Primary)',
    type: 'canine',
    isPrimary: true,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '74',
    quadrant: 7,
    position: 4,
    name: 'Lower Left First Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'lower',
    side: 'left',
  },
  {
    number: '75',
    quadrant: 7,
    position: 5,
    name: 'Lower Left Second Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'lower',
    side: 'left',
  },

  // QUADRANT 8 - Lower Right Primary (81-85)
  {
    number: '81',
    quadrant: 8,
    position: 1,
    name: 'Lower Right Central Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '82',
    quadrant: 8,
    position: 2,
    name: 'Lower Right Lateral Incisor (Primary)',
    type: 'incisor',
    isPrimary: true,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '83',
    quadrant: 8,
    position: 3,
    name: 'Lower Right Canine (Primary)',
    type: 'canine',
    isPrimary: true,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '84',
    quadrant: 8,
    position: 4,
    name: 'Lower Right First Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'lower',
    side: 'right',
  },
  {
    number: '85',
    quadrant: 8,
    position: 5,
    name: 'Lower Right Second Molar (Primary)',
    type: 'molar',
    isPrimary: true,
    jaw: 'lower',
    side: 'right',
  },
];

/**
 * Color palette for work types (vibrant, distinguishable colors)
 * Based on professional dental software color schemes
 */
export const WORK_TYPE_COLORS: WorkTypeColors = {
  crown: '#3B82F6', // Blue - Most common procedure
  bridge: '#8B5CF6', // Purple - Connects multiple teeth
  filling: '#10B981', // Green - Restoration
  implant: '#F59E0B', // Amber - Artificial root
  denture: '#EF4444', // Red - Full/partial replacement
  veneer: '#EC4899', // Pink - Cosmetic
  inlay: '#14B8A6', // Teal - Conservative restoration
  onlay: '#6366F1', // Indigo - Larger restoration
  root_canal: '#F97316', // Orange - Endodontic
  extraction: '#6B7280', // Gray - Tooth removal
};

/**
 * Tooth display colors for different states
 */
export const TOOTH_COLORS: ToothColors = {
  default: '#E8E8E8', // Light gray (enamel-like)
  hover: '#D0D0D0', // Slightly darker on hover
  selected: '#B0B0B0', // Gray when selected without work type
  border: '#999999', // Subtle border
  borderHover: '#1E40AF', // Blue border on hover
  text: '#333333', // Dark text for tooth numbers
};

/**
 * Canvas configuration for SVG layout
 */
export const CANVAS_CONFIG: CanvasConfig = {
  width: 550, // SVG width (compact - 55% of original)
  height: 300, // SVG height (compact - 50% of original)
  toothGap: 3, // Space between adjacent teeth (compact)
  quadrantGap: 18, // Space between quadrants (midline) (compact)
  padding: 20, // Padding around canvas edges (compact)
};

/**
 * Tooth dimensions for anatomically accurate rendering
 * Dimensions vary by tooth type for realistic appearance
 * Scaled proportionally to match 550x300 canvas (55% of original)
 */
export const TOOTH_DIMENSIONS: ToothDimensions = {
  incisor: {
    central: { width: 23, height: 36 }, // Widest incisors
    lateral: { width: 21, height: 34 }, // Slightly narrower
  },
  canine: { width: 22, height: 37 }, // Pointed, longest root
  premolar: { width: 21, height: 33 }, // Smaller than canines
  molar: { width: 25, height: 32 }, // Widest for grinding
};

/**
 * Tooth name mappings for display
 */
export const TOOTH_NAMES: Record<number, string> = {
  1: 'Central Incisor',
  2: 'Lateral Incisor',
  3: 'Canine',
  4: 'First Premolar', // Primary: First Molar
  5: 'Second Premolar', // Primary: Second Molar
  6: 'First Molar',
  7: 'Second Molar',
  8: 'Third Molar (Wisdom)',
};

/**
 * Work type display names for UI
 */
export const WORK_TYPE_LABELS: Record<string, string> = {
  crown: 'Crown',
  bridge: 'Bridge',
  filling: 'Filling',
  implant: 'Implant',
  denture: 'Denture',
  veneer: 'Veneer',
  inlay: 'Inlay',
  onlay: 'Onlay',
  root_canal: 'Root Canal',
  extraction: 'Extraction',
};

/**
 * Common work types (subset for simplified UI if needed)
 */
export const COMMON_WORK_TYPES = [
  'crown',
  'bridge',
  'filling',
  'implant',
  'denture',
] as const;

/**
 * Default tooth dimensions (fallback)
 */
export const DEFAULT_TOOTH_SIZE = {
  width: 40,
  height: 60,
};

/**
 * Minimum touch target size for accessibility (WCAG 2.1 AA)
 */
export const MIN_TOUCH_TARGET = 44; // pixels

/**
 * Z-index layers for overlapping elements
 */
export const Z_INDEX = {
  teeth: 1,
  hover: 2,
  modal: 100,
  tooltip: 200,
};
