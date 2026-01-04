'use client';

/**
 * WorkTypeSelector - Work Type Assignment Modal
 *
 * Modal dialog for selecting dental work types for a specific tooth.
 * Displays all available work types with color coding and descriptions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { WorkType } from './types';
import { WORK_TYPE_COLORS, WORK_TYPE_LABELS } from './constants';
import { formatToothName } from './utils';

export interface WorkTypeSelectorProps {
  /** The tooth number being edited */
  toothNumber: string;

  /** Current work type (if already assigned) */
  currentWorkType?: WorkType;

  /** Current shade/color (if already assigned) */
  currentShade?: string;

  /** Current notes (if already assigned) */
  currentNotes?: string;

  /** Callback fired when work type, shade, and notes are updated */
  onSelect: (workType: WorkType, shade?: string, notes?: string) => void;

  /** Callback fired when selector is closed without selection */
  onClose: () => void;

  /** Callback fired when tooth is removed/deselected */
  onRemove?: () => void;

  /** Available work types to choose from */
  availableWorkTypes?: WorkType[];
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
 * WorkTypeSelector Component
 *
 * Displays a modal dialog with buttons for each work type,
 * allowing users to assign dental procedures to selected teeth.
 */
export function WorkTypeSelector({
  toothNumber,
  currentWorkType,
  currentShade,
  currentNotes,
  onSelect,
  onClose,
  onRemove,
  availableWorkTypes = ALL_WORK_TYPES,
}: WorkTypeSelectorProps) {
  const t = useTranslations();
  const [selectedType, setSelectedType] = useState<WorkType | undefined>(
    currentWorkType
  );

  // Get translated work type label
  const getWorkTypeLabel = (workType: WorkType): string => {
    const labelMap: Record<WorkType, string> = {
      crown: t('teethSelector.workTypeCrown'),
      bridge: t('teethSelector.workTypeBridge'),
      filling: t('teethSelector.workTypeFilling'),
      implant: t('teethSelector.workTypeImplant'),
      denture: t('teethSelector.workTypeDenture'),
      veneer: t('teethSelector.workTypeVeneer'),
      inlay: t('teethSelector.workTypeInlay'),
      onlay: t('teethSelector.workTypeOnlay'),
      root_canal: t('teethSelector.workTypeRootCanal'),
      extraction: t('teethSelector.workTypeExtraction'),
    };
    return labelMap[workType];
  };

  /**
   * Handle Escape key to close modal
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Handle work type selection
   */
  const handleSelect = useCallback(
    (workType: WorkType) => {
      setSelectedType(workType);
      // Call onSelect with work type (shade and notes handled separately now)
      onSelect(workType, currentShade, currentNotes);
    },
    [onSelect, currentShade, currentNotes]
  );

  /**
   * Handle remove/deselect
   */
  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-type-modal-title"
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {/* Header */}
          <div className="mb-4">
            <h3
              id="work-type-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {t('teethSelector.selectWorkTypeTitle')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {formatToothName(toothNumber)}
            </p>
          </div>

          {/* Work Type Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {availableWorkTypes.map((workType) => (
              <button
                key={workType}
                onClick={() => handleSelect(workType)}
                className={`
                  relative px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${
                    selectedType === workType
                      ? 'ring-2 ring-offset-2 shadow-lg scale-105'
                      : 'hover:scale-102 hover:shadow-md'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  active:scale-95
                `}
                style={{
                  backgroundColor: WORK_TYPE_COLORS[workType],
                  color: '#FFFFFF',
                  ringColor: WORK_TYPE_COLORS[workType],
                }}
                aria-label={`${getWorkTypeLabel(workType)} ${
                  selectedType === workType ? '(selected)' : ''
                }`}
                aria-pressed={selectedType === workType}
              >
                {/* Checkmark for selected */}
                {selectedType === workType && (
                  <span className="absolute top-1 right-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}

                <span className="block text-center">
                  {getWorkTypeLabel(workType)}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-gray-200">
            {/* Remove/Deselect Button (if tooth is already selected) */}
            {onRemove && currentWorkType && (
              <button
                onClick={handleRemove}
                className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {t('teethSelector.removeToothButton')}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('teethSelector.cancelButton')}
            </button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            {t('teethSelector.selectWorkTypeInstruction')}
          </p>
        </div>
      </div>
    </>
  );
}
