'use client';

/**
 * WorkTypeToolbar — Compact horizontal work-type selector strip
 *
 * Primary types (larger): crown, bridge, veneer, implant, root_canal
 * Secondary types (smaller, muted): filling, inlay, onlay, denture, extraction
 */

import { useTranslations } from 'next-intl';
import type { WorkType } from './types';
import { WORK_TYPE_COLORS } from './constants';
import { cn } from '@/lib/utils';

export interface WorkTypeToolbarProps {
  selectedWorkType: WorkType;
  onSelectWorkType: (workType: WorkType) => void;
  availableWorkTypes?: WorkType[];
  disabled?: boolean;
}

const PRIMARY_TYPES: WorkType[] = ['crown', 'bridge', 'veneer', 'implant', 'root_canal'];
const SECONDARY_TYPES: WorkType[] = ['filling', 'inlay', 'onlay', 'denture', 'extraction'];

export function WorkTypeToolbar({
  selectedWorkType,
  onSelectWorkType,
  disabled = false,
}: WorkTypeToolbarProps) {
  const tFdi = useTranslations('fdi');
  const tWorkTypes = useTranslations('fdi.workTypes');

  const renderButton = (workType: WorkType, isPrimary: boolean) => {
    const isSelected = selectedWorkType === workType;
    return (
      <button
        key={workType}
        type="button"
        onClick={() => !disabled && onSelectWorkType(workType)}
        disabled={disabled}
        className={cn(
          'rounded transition-all duration-100 whitespace-nowrap',
          isPrimary ? 'px-2.5 py-1 text-xs font-medium' : 'px-2 py-0.5 text-[11px] font-normal',
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-400 mr-0.5">{tFdi('selectWorkType')}:</span>
        {PRIMARY_TYPES.map(wt => renderButton(wt, true))}
        {SECONDARY_TYPES.map(wt => renderButton(wt, false))}
      </div>
      <div className="flex gap-4 text-[10px] text-gray-400">
        <span>• {tFdi('helpClickTeeth')}</span>
        <span>• {tFdi('helpShiftClick')}</span>
        <span>• {tFdi('helpRightClick')}</span>
      </div>
    </div>
  );
}
