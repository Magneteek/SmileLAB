/**
 * TeethSelector - FDI Tooth Notation Selector Component
 *
 * Public API exports for the TeethSelector component.
 * Use this for importing the component and related types.
 *
 * @example
 * import { TeethSelector, type ToothSelection } from '@/components/worksheets/TeethSelector';
 */

// Main component (will be implemented in next step)
export { TeethSelector } from './TeethSelector';

// Sub-components (will be implemented in next step)
export { ToothElement } from './ToothElement';
export { WorkTypeSelector } from './WorkTypeSelector';
export { TeethLegend } from './TeethLegend';
export { SelectionSummary } from './SelectionSummary';

// TypeScript types
export type {
  ToothData,
  ToothSelection,
  ToothCoordinates,
  ToothType,
  WorkType,
  ToothMode,
  Quadrant,
  TeethSelectorProps,
  ToothElementProps,
  WorkTypeSelectorProps,
  WorkTypeColors,
  ToothColors,
  ValidationResult,
} from './types';

// Type conversion utilities
export {
  toGlobalWorkType,
  fromGlobalWorkType,
  toTeethSelectionData,
} from './types';

// Constants
export {
  PERMANENT_TEETH,
  PRIMARY_TEETH,
  WORK_TYPE_COLORS,
  TOOTH_COLORS,
  CANVAS_CONFIG,
  TOOTH_DIMENSIONS,
  WORK_TYPE_LABELS,
} from './constants';

// Utility functions
export {
  isValidFDINumber,
  getToothByNumber,
  getTeethByQuadrant,
  getToothType,
  getToothDimensions,
  getToothCoordinates,
  validateToothSelections,
  isWisdomTooth,
  isFrontTooth,
  getAdjacentTeeth,
  formatToothName,
  groupByQuadrant,
  isValidWorkType,
} from './utils';
