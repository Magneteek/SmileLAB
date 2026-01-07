/**
 * FDI Tooth Notation System - TypeScript Type Definitions
 *
 * This file contains all type definitions for the TeethSelector component,
 * implementing the FDI World Dental Federation two-digit notation system (ISO 3950).
 *
 * @see {@link /deliverables/research/FDI-NOTATION-SYSTEM-RESEARCH.md} for detailed FDI notation documentation
 */

import { WorkType as GlobalWorkType } from '@/src/types/worksheet';

/**
 * FDI Quadrant numbers for permanent teeth (1-4) and primary teeth (5-8)
 *
 * Quadrant numbering (clockwise from patient's upper right):
 * - Permanent: 1 (upper right), 2 (upper left), 3 (lower left), 4 (lower right)
 * - Primary: 5 (upper right), 6 (upper left), 7 (lower left), 8 (lower right)
 */
export type Quadrant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Tooth position within a quadrant (1-8 for permanent, 1-5 for primary)
 *
 * Position numbering (from midline to back of mouth):
 * - 1: Central Incisor
 * - 2: Lateral Incisor
 * - 3: Canine
 * - 4: First Premolar (permanent) / First Molar (primary)
 * - 5: Second Premolar (permanent) / Second Molar (primary)
 * - 6: First Molar (permanent only)
 * - 7: Second Molar (permanent only)
 * - 8: Third Molar/Wisdom (permanent only)
 */
export type ToothPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Tooth type classification by function
 */
export type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

/**
 * Upper or lower jaw (maxilla or mandible)
 */
export type Jaw = 'upper' | 'lower';

/**
 * Left or right side from patient's anatomical perspective
 */
export type Side = 'left' | 'right';

/**
 * Display mode for the teeth selector component
 *
 * - permanent: Show adult teeth (quadrants 1-4, 32 teeth)
 * - primary: Show baby teeth (quadrants 5-8, 20 teeth)
 * - mixed: Show both permanent and primary teeth (for transitional dentition)
 */
export type ToothMode = 'permanent' | 'primary' | 'mixed';

/**
 * Types of dental work/procedures that can be performed on a tooth
 * Uses lowercase for better UX in the component
 * Maps to GlobalWorkType enum for service layer compatibility
 */
export type WorkType =
  | 'crown'
  | 'bridge'
  | 'filling'
  | 'implant'
  | 'denture'
  | 'veneer'
  | 'inlay'
  | 'onlay'
  | 'root_canal'
  | 'extraction';

/**
 * Complete tooth data model with FDI notation and metadata
 *
 * This interface represents a single tooth in the FDI notation system
 * with all necessary metadata for display and interaction.
 */
export interface ToothData {
  /**
   * FDI two-digit notation (e.g., "11", "21", "51")
   * - First digit: Quadrant (1-8)
   * - Second digit: Position (1-8 for permanent, 1-5 for primary)
   */
  number: string;

  /**
   * Quadrant number (1-8)
   * @see Quadrant type for details
   */
  quadrant: Quadrant;

  /**
   * Position within quadrant (1-8 or 1-5)
   * @see ToothPosition type for details
   */
  position: ToothPosition;

  /**
   * Full descriptive name
   * @example "Upper Right Central Incisor", "Lower Left First Molar"
   */
  name: string;

  /**
   * Tooth type classification
   * @see ToothType for available types
   */
  type: ToothType;

  /**
   * Whether this is a primary (deciduous/baby) tooth
   * - true: Primary tooth (quadrants 5-8)
   * - false: Permanent tooth (quadrants 1-4)
   */
  isPrimary: boolean;

  /**
   * Upper or lower jaw
   */
  jaw: Jaw;

  /**
   * Left or right side (patient's perspective)
   */
  side: Side;
}

/**
 * Selected tooth with assigned work type
 *
 * This represents a tooth that has been selected in the UI
 * and has a dental procedure/work type assigned to it.
 * Compatible with TeethSelectionData from global worksheet types
 */
export interface ToothSelection {
  /**
   * FDI tooth number (e.g., "11", "26", "51")
   */
  toothNumber: string;

  /**
   * Type of dental work to be performed
   */
  workType: WorkType;

  /**
   * Optional tooth shade/color
   */
  shade?: string;

  /**
   * Optional tooth shape (e.g., square, triangular, ovoid)
   */
  toothShape?: string;

  /**
   * Optional notes or additional details
   */
  notes?: string;
}

/**
 * SVG coordinates for tooth positioning
 */
export interface ToothCoordinates {
  /**
   * X coordinate in SVG viewBox
   */
  x: number;

  /**
   * Y coordinate in SVG viewBox
   */
  y: number;

  /**
   * Tooth width in pixels
   */
  width: number;

  /**
   * Tooth height in pixels
   */
  height: number;
}

/**
 * Props for the main TeethSelector component
 */
export interface TeethSelectorProps {
  /**
   * Currently selected teeth with work types
   * This is a controlled component - parent manages state
   */
  selectedTeeth: ToothSelection[];

  /**
   * Callback fired when tooth selection changes
   * @param teeth - Updated array of selected teeth
   */
  onTeethChange: (teeth: ToothSelection[]) => void;

  /**
   * Display mode for teeth
   * @default 'permanent'
   */
  mode?: ToothMode;

  /**
   * Whether the component is read-only (no interaction)
   * Useful for displaying existing selections without editing
   * @default false
   */
  readOnly?: boolean;

  /**
   * Optional CSS class name for styling
   */
  className?: string;

  /**
   * Whether to show the legend/color key
   * @default true
   */
  showLegend?: boolean;

  /**
   * Whether to show tooth labels (FDI numbers)
   * @default true
   */
  showLabels?: boolean;
}

/**
 * Props for individual tooth SVG element
 */
export interface ToothElementProps {
  /**
   * Tooth data (FDI notation and metadata)
   */
  tooth: ToothData;

  /**
   * Whether this tooth is currently selected
   */
  isSelected: boolean;

  /**
   * Whether this tooth is currently hovered
   */
  isHovered: boolean;

  /**
   * Work type assigned to this tooth (if selected)
   */
  workType?: WorkType;

  /**
   * SVG coordinates for positioning
   */
  coordinates: ToothCoordinates;

  /**
   * Click handler for tooth selection
   */
  onClick: () => void;

  /**
   * Mouse enter handler for hover state
   */
  onMouseEnter: () => void;

  /**
   * Mouse leave handler for hover state
   */
  onMouseLeave: () => void;

  /**
   * Whether interaction is disabled (read-only mode)
   */
  disabled?: boolean;
}

/**
 * Props for work type selector modal/dropdown
 */
export interface WorkTypeSelectorProps {
  /**
   * The tooth number being edited
   */
  toothNumber: string;

  /**
   * Current work type (if already assigned)
   */
  currentWorkType?: WorkType;

  /**
   * Callback fired when work type is selected
   * @param workType - Selected work type
   */
  onSelect: (workType: WorkType) => void;

  /**
   * Callback fired when selector is closed without selection
   */
  onClose: () => void;

  /**
   * Available work types to choose from
   * If not provided, all work types are available
   */
  availableWorkTypes?: WorkType[];

  /**
   * Position to display the selector (for positioning)
   */
  position?: { x: number; y: number };
}

/**
 * Color configuration for work types
 */
export interface WorkTypeColors {
  crown: string;
  bridge: string;
  filling: string;
  implant: string;
  denture: string;
  veneer: string;
  inlay: string;
  onlay: string;
  root_canal: string;
  extraction: string;
}

/**
 * Theme colors for teeth display
 */
export interface ToothColors {
  /**
   * Default tooth color (unselected)
   */
  default: string;

  /**
   * Hover state color
   */
  hover: string;

  /**
   * Selected but no work type assigned
   */
  selected: string;

  /**
   * Border/stroke color
   */
  border: string;

  /**
   * Border color on hover
   */
  borderHover: string;

  /**
   * Text color for tooth numbers
   */
  text: string;
}

/**
 * Configuration for SVG canvas dimensions
 */
export interface CanvasConfig {
  /**
   * Canvas width in pixels
   */
  width: number;

  /**
   * Canvas height in pixels
   */
  height: number;

  /**
   * Gap between teeth in pixels
   */
  toothGap: number;

  /**
   * Gap between quadrants in pixels
   */
  quadrantGap: number;

  /**
   * Padding around canvas edges
   */
  padding: number;
}

/**
 * Tooth dimensions by type (for anatomically accurate rendering)
 */
export interface ToothDimensions {
  incisor: {
    central: { width: number; height: number };
    lateral: { width: number; height: number };
  };
  canine: { width: number; height: number };
  premolar: { width: number; height: number };
  molar: { width: number; height: number };
}

/**
 * Internal component state (not exposed via props)
 */
export interface TeethSelectorState {
  /**
   * Currently hovered tooth number (null if none)
   */
  hoveredTooth: string | null;

  /**
   * Tooth currently being edited (work type selector open)
   */
  editingTooth: string | null;

  /**
   * Current display mode
   */
  displayMode: ToothMode;
}

/**
 * Validation result for tooth selection
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  isValid: boolean;

  /**
   * Error message if validation failed
   */
  error?: string;
}

/**
 * Type guard to check if a string is a valid FDI tooth number
 */
export type FDINumberValidator = (number: string) => boolean;

/**
 * Type guard to check if a string is a valid work type
 */
export type WorkTypeValidator = (workType: string) => workType is WorkType;

// All types are already exported in their definitions above

// ============================================================================
// TYPE CONVERSION UTILITIES
// ============================================================================

/**
 * Convert component WorkType to global WorkType enum
 * Maps lowercase strings to uppercase enum values
 */
export function toGlobalWorkType(workType: WorkType): GlobalWorkType {
  const mapping: Record<WorkType, GlobalWorkType> = {
    crown: 'CROWN' as GlobalWorkType,
    bridge: 'BRIDGE' as GlobalWorkType,
    veneer: 'VENEER' as GlobalWorkType,
    denture: 'DENTURE' as GlobalWorkType,
    implant: 'IMPLANT' as GlobalWorkType,
    inlay: 'INLAY_ONLAY' as GlobalWorkType,
    onlay: 'INLAY_ONLAY' as GlobalWorkType,
    filling: 'FILLING' as GlobalWorkType,
    root_canal: 'OTHER' as GlobalWorkType,
    extraction: 'OTHER' as GlobalWorkType,
  };

  return mapping[workType];
}

/**
 * Convert global WorkType enum to component WorkType
 * Maps uppercase enum values to lowercase strings
 */
export function fromGlobalWorkType(workType: GlobalWorkType): WorkType {
  const mapping: Record<string, WorkType> = {
    CROWN: 'crown',
    BRIDGE: 'bridge',
    VENEER: 'veneer',
    DENTURE: 'denture',
    IMPLANT: 'implant',
    INLAY_ONLAY: 'inlay',
    FILLING: 'filling',
    ORTHODONTICS: 'root_canal',
    OTHER: 'extraction',
  };

  return mapping[workType] ?? 'crown';
}

/**
 * Convert ToothSelection array to TeethSelectionData format
 * Prepares data for worksheet service
 */
export function toTeethSelectionData(
  selections: ToothSelection[] | undefined
): { teeth: Array<{ toothNumber: string; workType: GlobalWorkType | string; shade?: string; notes?: string }> } {
  // Handle undefined or null input
  if (!selections || !Array.isArray(selections)) {
    return { teeth: [] };
  }

  return {
    teeth: selections.map((sel) => ({
      toothNumber: sel.toothNumber,
      workType: toGlobalWorkType(sel.workType),
      shade: sel.shade,
      notes: sel.notes,
    })),
  };
}
