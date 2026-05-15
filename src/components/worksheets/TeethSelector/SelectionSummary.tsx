'use client';

import { useTranslations } from 'next-intl';
import type { ToothSelection } from './types';
import { X } from 'lucide-react';
import { WORK_TYPE_COLORS } from './constants';

export interface SelectionSummaryProps {
  selectedTeeth: ToothSelection[];
  onRemoveTooth?: (toothNumber: string) => void;
  readOnly?: boolean;
}

export function SelectionSummary({
  selectedTeeth,
  onRemoveTooth,
  readOnly = false,
}: SelectionSummaryProps) {
  const t = useTranslations();
  const tWorkTypes = useTranslations('fdi.workTypes');

  if (selectedTeeth.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 px-0.5">
        {t('teethSelector.teethSelectedCount_plural', { count: selectedTeeth.length })}
      </div>
      <div className="space-y-0.5">
        {selectedTeeth.map((tooth) => (
          <div
            key={tooth.toothNumber}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group text-xs"
          >
            {/* Color dot */}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: WORK_TYPE_COLORS[tooth.workType] }}
            />
            {/* Number */}
            <span className="font-mono font-bold text-gray-700 w-6 shrink-0">{tooth.toothNumber}</span>
            {/* Work type */}
            <span className="text-gray-500 flex-1 truncate">
              {tWorkTypes(tooth.workType.toUpperCase() as any)}
            </span>
            {/* Implant arrows */}
            {tooth.implant && (
              <span className="text-gray-500 font-bold text-[10px] shrink-0">▲▼</span>
            )}
            {/* Remove */}
            {!readOnly && onRemoveTooth && (
              <button
                type="button"
                onClick={() => onRemoveTooth(tooth.toothNumber)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 shrink-0 h-6 w-6 flex items-center justify-center rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
