'use client';

/**
 * WorkTypeToolbar - Horizontal Toolbar for Work Type Selection
 *
 * Displays all available work types as toolbar buttons.
 * Users select a work type first, then click teeth to apply it.
 */

import { useTranslations } from 'next-intl';
import type { WorkType } from './types';
import { WORK_TYPE_COLORS } from './constants';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkTypeToolbarProps {
  /** Currently selected work type */
  selectedWorkType: WorkType;

  /** Callback when work type is selected */
  onSelectWorkType: (workType: WorkType) => void;

  /** Available work types to display */
  availableWorkTypes?: WorkType[];

  /** Whether toolbar is disabled */
  disabled?: boolean;
}

// All available work types
const ALL_WORK_TYPES: WorkType[] = [
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

/**
 * WorkTypeToolbar Component
 *
 * Horizontal toolbar showing all dental work types as color-coded buttons.
 */
export function WorkTypeToolbar({
  selectedWorkType,
  onSelectWorkType,
  availableWorkTypes = ALL_WORK_TYPES,
  disabled = false,
}: WorkTypeToolbarProps) {
  const tWorkTypes = useTranslations('fdi.workTypes');
  const tFdi = useTranslations('fdi');

  // Get translated work type label
  const getWorkTypeLabel = (workType: WorkType): string => {
    // Use the fdi.workTypes translation keys we added
    return tWorkTypes(workType.toUpperCase() as any);
  };

  return (
    <div className="w-full">
      {/* Toolbar Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {tFdi('selectWorkType')}
          </h3>
          <p className="text-xs text-gray-600">
            {tFdi('clickToSelect')}
          </p>
        </div>
        {/* Current selection indicator */}
        <div className="text-xs text-gray-600 flex items-center gap-1">
          <span className="font-medium">Selected:</span>
          <span
            className="px-2 py-0.5 rounded text-white font-medium"
            style={{ backgroundColor: WORK_TYPE_COLORS[selectedWorkType] }}
          >
            {getWorkTypeLabel(selectedWorkType)}
          </span>
        </div>
      </div>

      {/* Work Type Buttons */}
      <div className="flex flex-wrap gap-2">
        {availableWorkTypes.map((workType) => {
          const isSelected = selectedWorkType === workType;

          return (
            <button
              key={workType}
              onClick={() => !disabled && onSelectWorkType(workType)}
              disabled={disabled}
              className={cn(
                'relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'ring-2 ring-offset-1 shadow-md scale-105'
                  : 'hover:scale-102 hover:shadow-sm active:scale-95'
              )}
              style={{
                backgroundColor: WORK_TYPE_COLORS[workType],
                color: '#FFFFFF',
                ['--tw-ring-color' as string]: WORK_TYPE_COLORS[workType],
              }}
              aria-label={`${getWorkTypeLabel(workType)} ${isSelected ? '(selected)' : ''}`}
              aria-pressed={isSelected}
            >
              {/* Checkmark for selected */}
              {isSelected && (
                <Check className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full text-green-600" />
              )}

              <span>{getWorkTypeLabel(workType)}</span>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
        <p>• {tFdi('helpClickTeeth')}</p>
        <p>• {tFdi('helpShiftClick')}</p>
        <p>• {tFdi('helpRightClick')}</p>
      </div>
    </div>
  );
}
