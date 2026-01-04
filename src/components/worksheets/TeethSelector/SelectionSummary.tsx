'use client';

/**
 * SelectionSummary - Display summary of selected teeth
 *
 * Shows count, work types, shades, tooth types and notes for all selected teeth
 */

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { ToothSelection } from './types';
import { X, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getToothByNumber, formatToothName } from './utils';
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

  // Get translated work type label
  const getWorkTypeLabel = (workType: string): string => {
    const labelMap: Record<string, string> = {
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
    return labelMap[workType] || workType;
  };

  if (selectedTeeth.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic py-2">
        {t('teethSelector.noTeethSelected')}
      </div>
    );
  }

  // Group by work type for summary stats
  const workTypeCounts = selectedTeeth.reduce((acc, tooth) => {
    acc[tooth.workType] = (acc[tooth.workType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-2">
      {/* Summary Stats */}
      <div className="flex items-center gap-3 text-xs">
        <div className="font-semibold">
          {t(
            selectedTeeth.length === 1
              ? 'teethSelector.teethSelectedCount'
              : 'teethSelector.teethSelectedCount_plural',
            { count: selectedTeeth.length }
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(workTypeCounts).map(([workType, count]) => (
            <Badge key={workType} variant="secondary" className="text-xs py-0 px-1.5">
              {getWorkTypeLabel(workType)}: {count}
            </Badge>
          ))}
        </div>
      </div>

      {/* Selected Teeth List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {selectedTeeth.map((tooth) => {
          const toothData = getToothByNumber(tooth.toothNumber);
          const toothName = toothData ? toothData.name : `Tooth ${tooth.toothNumber}`;

          return (
            <Card key={tooth.toothNumber} className="p-2 relative group">
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  {/* Tooth Number and Work Type */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono font-bold text-base text-blue-600">
                      #{tooth.toothNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs py-0 px-1 border-0 text-white font-medium"
                      style={{ backgroundColor: WORK_TYPE_COLORS[tooth.workType] }}
                    >
                      {tooth.workType}
                    </Badge>
                  </div>

                  {/* Tooth Name and Type */}
                  {toothData && (
                    <div className="text-xs text-gray-600 mb-0.5">
                      {toothName}
                    </div>
                  )}

                  {/* Shade Information - Prominent */}
                  {tooth.shade && (
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded mt-1">
                      <Paintbrush className="h-3 w-3 text-purple-600" />
                      <span className="text-gray-600">Shade:</span>
                      <span className="text-purple-700">{tooth.shade}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {tooth.notes && (
                    <div className="text-xs text-gray-500 mt-1 truncate" title={tooth.notes}>
                      💬 {tooth.notes}
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {!readOnly && onRemoveTooth && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveTooth(tooth.toothNumber)}
                    title="Remove tooth"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
