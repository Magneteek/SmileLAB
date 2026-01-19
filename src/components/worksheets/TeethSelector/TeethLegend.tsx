'use client';

/**
 * TeethLegend - Work Type Color Legend
 *
 * Displays a color-coded legend showing all available work types
 * and their corresponding colors for easy reference.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { WORK_TYPE_COLORS } from './constants';
import type { WorkType } from './types';

export interface TeethLegendProps {
  /** Optional CSS class name for styling */
  className?: string;

  /** Whether to display in compact mode (horizontal) */
  compact?: boolean;
}

// Work types to display in legend (most common first)
const LEGEND_WORK_TYPES: WorkType[] = [
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
 * TeethLegend Component
 *
 * Displays a visual legend of work type colors to help users
 * understand the color coding system.
 */
export function TeethLegend({ className, compact = false }: TeethLegendProps) {
  const t = useTranslations();
  const tWorkTypes = useTranslations('fdi.workTypes');

  // Get translated work type label using FDI translation keys
  const getWorkTypeLabel = (workType: WorkType): string => {
    // Map work type to uppercase key for FDI translations
    return tWorkTypes(workType.toUpperCase() as any);
  };

  return (
    <div className={cn('teeth-legend', className)}>
      {/* Header */}
      <h4 className="text-xs font-semibold text-gray-700 mb-1">{t('teethSelector.workTypesTitle')}</h4>

      {/* Legend Items */}
      <div
        className={cn(
          'flex flex-wrap gap-2',
          compact ? 'flex-row' : 'flex-col sm:flex-row'
        )}
      >
        {LEGEND_WORK_TYPES.map((workType) => (
          <div
            key={workType}
            className="flex items-center gap-1.5"
            role="listitem"
          >
            {/* Color Swatch */}
            <div
              className="w-3 h-3 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: WORK_TYPE_COLORS[workType] }}
              aria-label={`${getWorkTypeLabel(workType)} color indicator`}
            />

            {/* Label */}
            <span className="text-xs text-gray-600">
              {getWorkTypeLabel(workType)}
            </span>
          </div>
        ))}
      </div>

      {/* Additional Info (optional) */}
      <p className="text-xs text-gray-500 mt-1.5">
        {t('teethSelector.workTypeInstruction')}
      </p>
    </div>
  );
}
