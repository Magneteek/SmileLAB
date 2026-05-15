'use client';

/**
 * WorkTypeToolbar — Compact horizontal work-type selector strip
 *
 * Primary types (larger): crown, bridge, veneer, implant, root_canal
 * Secondary types (smaller, muted): filling, inlay, onlay, denture, extraction
 */

import { useTranslations } from 'next-intl';
import type { WorkType } from './types';
import { WORK_TYPE_COLORS, IMPLANT_BADGE_COLOR } from './constants';
import { cn } from '@/lib/utils';

export interface WorkTypeToolbarProps {
  selectedWorkType: WorkType;
  onSelectWorkType: (workType: WorkType) => void;
  implantMode: boolean;
  onToggleImplantMode: () => void;
  availableWorkTypes?: WorkType[];
  disabled?: boolean;
}

const PRIMARY_TYPES: WorkType[] = ['crown', 'bridge', 'veneer', 'denture', 'wizil'];
const SECONDARY_TYPES: WorkType[] = ['inlay', 'onlay'];

export function WorkTypeToolbar({
  selectedWorkType,
  onSelectWorkType,
  implantMode,
  onToggleImplantMode,
  disabled = false,
}: WorkTypeToolbarProps) {
  const tFdi = useTranslations('fdi');
  const tWorkTypes = useTranslations('fdi.workTypes');

  const renderButton = (workType: WorkType, isPrimary: boolean) => {
    const isSelected = selectedWorkType === workType && !implantMode;
    return (
      <button
        key={workType}
        type="button"
        onClick={() => !disabled && onSelectWorkType(workType)}
        disabled={disabled}
        className={cn(
          'rounded transition-all duration-100 whitespace-nowrap min-h-[36px] px-3 py-1.5 text-xs font-medium',
          isSelected ? 'ring-2 ring-offset-1 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100',
          disabled && 'cursor-default'
        )}
        style={{
          backgroundColor: WORK_TYPE_COLORS[workType],
          color: '#fff',
          ['--tw-ring-color' as string]: WORK_TYPE_COLORS[workType],
        }}
        aria-pressed={isSelected}
      >
        {tWorkTypes(workType.toUpperCase() as any)}
      </button>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-gray-400 w-full sm:w-auto">{tFdi('selectWorkType')}:</span>
        {PRIMARY_TYPES.map(wt => renderButton(wt, true))}
        {SECONDARY_TYPES.map(wt => renderButton(wt, false))}

        {/* Implant toggle */}
        <button
          type="button"
          onClick={() => !disabled && onToggleImplantMode()}
          disabled={disabled}
          className={cn(
            'rounded transition-all duration-100 whitespace-nowrap min-h-[36px] px-3 py-1.5 text-xs font-medium',
            implantMode ? 'ring-2 ring-offset-1 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100',
            disabled && 'cursor-default'
          )}
          style={{
            backgroundColor: IMPLANT_BADGE_COLOR,
            color: '#fff',
            ['--tw-ring-color' as string]: IMPLANT_BADGE_COLOR,
          }}
          aria-pressed={implantMode}
          title={tFdi('implantModeHelp')}
        >
          ▼▲ {tFdi('implantMode')}
        </button>
      </div>
      <div className="hidden sm:flex flex-wrap gap-3 text-[10px] text-gray-400">
        <span>• {tFdi('helpClickTeeth')}</span>
        <span>• {tFdi('helpShiftClick')}</span>
        <span>• {tFdi('helpRightClick')}</span>
        {implantMode && (
          <span className="text-amber-500 font-medium">• {tFdi('implantModeActive')}</span>
        )}
      </div>
      {implantMode && (
        <div className="sm:hidden text-[10px] text-amber-500 font-medium">• {tFdi('implantModeActive')}</div>
      )}
    </div>
  );
}
