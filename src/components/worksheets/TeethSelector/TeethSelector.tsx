'use client';

/**
 * TeethSelector — FDI dental arch selector (HTML/CSS layout)
 *
 * Renders two rows of HTML buttons arranged as upper and lower arches.
 * Each tooth is sized and shaped by type (incisor/canine/premolar/molar)
 * with the arch-curve effect achieved via flex alignment + per-tooth margin.
 *
 * Layout (patient's perspective, standard dental chart orientation):
 *   Upper: [18..11 | 21..28]   Q1 mirrored left, Q2 right
 *   Lower: [48..41 | 31..38]   Q4 mirrored left, Q3 right
 *
 * Numbers appear outside the arch (above upper, below lower).
 * Hover tooltip appears in a fixed bar at the bottom of the chart.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TeethSelectorProps, WorkType } from './types';
import { PERMANENT_TEETH, PRIMARY_TEETH } from './constants';
import { ToothElement } from './ToothElement';
import { WorkTypeToolbar } from './WorkTypeToolbar';
import { TeethLegend } from './TeethLegend';
import { SelectionSummary } from './SelectionSummary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function TeethSelector({
  selectedTeeth = [],
  onTeethChange,
  mode = 'permanent',
  readOnly = false,
  className,
  showLegend = true,
  showLabels = true,
  layout = 'default',
}: TeethSelectorProps & { layout?: 'default' | 'sidebar' }) {
  const t = useTranslations();
  const tFdi = useTranslations('fdi');

  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('crown');
  const [implantMode, setImplantMode] = useState(false);
  const [lastClickedTooth, setLastClickedTooth] = useState<string | null>(null);
  const [editingShade, setEditingShade] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  // ============================================================================
  // TOOTH DATA — grouped by quadrant in display order
  // ============================================================================

  const displayTeeth = useMemo(() => {
    if (mode === 'primary') return PRIMARY_TEETH;
    if (mode === 'mixed') return [...PERMANENT_TEETH, ...PRIMARY_TEETH];
    return PERMANENT_TEETH;
  }, [mode]);

  // Q1 (11–18) reversed: 18 17 16 ... 11 — patient's upper-right shown on viewer's left
  const q1 = useMemo(() =>
    displayTeeth.filter(t => t.quadrant === 1).sort((a, b) => b.position - a.position),
    [displayTeeth]
  );
  // Q2 (21–28) forward: 21 22 ... 28
  const q2 = useMemo(() =>
    displayTeeth.filter(t => t.quadrant === 2).sort((a, b) => a.position - b.position),
    [displayTeeth]
  );
  // Q4 (41–48) reversed: 48 47 ... 41
  const q4 = useMemo(() =>
    displayTeeth.filter(t => t.quadrant === 4).sort((a, b) => b.position - a.position),
    [displayTeeth]
  );
  // Q3 (31–38) forward: 31 32 ... 38
  const q3 = useMemo(() =>
    displayTeeth.filter(t => t.quadrant === 3).sort((a, b) => a.position - b.position),
    [displayTeeth]
  );

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  const getTeethInRange = useCallback((start: string, end: string): string[] => {
    const si = displayTeeth.findIndex(t => t.number === start);
    const ei = displayTeeth.findIndex(t => t.number === end);
    if (si === -1 || ei === -1) return [];
    const min = Math.min(si, ei);
    const max = Math.max(si, ei);
    return displayTeeth.slice(min, max + 1).map(t => t.number);
  }, [displayTeeth]);

  const handleToothClick = useCallback((toothNumber: string, event?: React.MouseEvent) => {
    if (readOnly) return;

    const existing = selectedTeeth.find(t => t.toothNumber === toothNumber);

    // Implant mode: toggle the implant flag on the clicked tooth
    if (implantMode) {
      if (existing) {
        onTeethChange(selectedTeeth.map(t =>
          t.toothNumber === toothNumber ? { ...t, implant: !t.implant } : t
        ));
      } else {
        // Not yet selected — select it with current work type + implant flag
        onTeethChange([...selectedTeeth, { toothNumber, workType: selectedWorkType, implant: true }]);
      }
      setLastClickedTooth(toothNumber);
      return;
    }

    // Denture: auto-select entire jaw on first click; toggle off if already all selected
    if (selectedWorkType === 'denture') {
      const clickedTooth = displayTeeth.find(t => t.number === toothNumber);
      if (clickedTooth) {
        const jawTeeth = displayTeeth.filter(t => t.jaw === clickedTooth.jaw);
        const jawNumbers = jawTeeth.map(t => t.number);
        const allJawSelected = jawNumbers.every(n =>
          selectedTeeth.some(t => t.toothNumber === n && t.workType === 'denture')
        );
        if (allJawSelected) {
          // Deselect entire jaw
          onTeethChange(selectedTeeth.filter(t => !jawNumbers.includes(t.toothNumber)));
        } else {
          // Select entire jaw (replace any existing entries for those teeth)
          const without = selectedTeeth.filter(t => !jawNumbers.includes(t.toothNumber));
          onTeethChange([...without, ...jawNumbers.map(n => ({ toothNumber: n, workType: 'denture' as const }))]);
        }
        setLastClickedTooth(toothNumber);
        return;
      }
    }

    // Shift+click: range selection
    if (event?.shiftKey && lastClickedTooth && lastClickedTooth !== toothNumber) {
      const range = getTeethInRange(lastClickedTooth, toothNumber);
      const updated = [...selectedTeeth];
      range.forEach(n => {
        const idx = updated.findIndex(t => t.toothNumber === n);
        if (idx !== -1) updated[idx] = { ...updated[idx], workType: selectedWorkType };
        else updated.push({ toothNumber: n, workType: selectedWorkType });
      });
      onTeethChange(updated);
      setLastClickedTooth(toothNumber);
      return;
    }

    if (existing) {
      // Same work type → deselect; different → update type
      if (existing.workType === selectedWorkType) {
        onTeethChange(selectedTeeth.filter(t => t.toothNumber !== toothNumber));
      } else {
        onTeethChange(selectedTeeth.map(t =>
          t.toothNumber === toothNumber ? { ...t, workType: selectedWorkType } : t
        ));
      }
    } else {
      onTeethChange([...selectedTeeth, { toothNumber, workType: selectedWorkType }]);
    }
    setLastClickedTooth(toothNumber);
  }, [selectedTeeth, onTeethChange, readOnly, selectedWorkType, implantMode, lastClickedTooth, getTeethInRange, displayTeeth]);

  const handleToothRemove = useCallback((toothNumber: string) => {
    onTeethChange(selectedTeeth.filter(t => t.toothNumber !== toothNumber));
  }, [selectedTeeth, onTeethChange]);

  const handleShadeNotesUpdate = useCallback(() => {
    if (selectedTeeth.length === 0) return;
    onTeethChange(selectedTeeth.map(t => ({
      ...t,
      shade: editingShade || t.shade,
      notes: editingNotes || t.notes,
    })));
  }, [selectedTeeth, editingShade, editingNotes, onTeethChange]);

  // ============================================================================
  // TOOTH RENDER HELPER
  // ============================================================================

  const renderTooth = (tooth: typeof PERMANENT_TEETH[0], jaw: 'upper' | 'lower') => {
    const sel = selectedTeeth.find(t => t.toothNumber === tooth.number);
    return (
      <ToothElement
        key={tooth.number}
        tooth={tooth}
        jaw={jaw}
        isSelected={!!sel}
        isHovered={hoveredTooth === tooth.number}
        workType={sel?.workType}
        implant={sel?.implant}
        onClick={(e) => handleToothClick(tooth.number, e)}
        onRightClick={() => handleToothRemove(tooth.number)}
        onMouseEnter={() => setHoveredTooth(tooth.number)}
        onMouseLeave={() => setHoveredTooth(null)}
        disabled={readOnly}
        showLabel={showLabels}
      />
    );
  };

  // ============================================================================
  // SUB-ELEMENTS
  // ============================================================================

  const chartElement = (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400">
        <span className="font-medium text-gray-500">{tFdi('upperJaw')}</span>
        <span>FDI / ISO 3950</span>
        <div className="flex items-center gap-3">
          {!readOnly && selectedTeeth.length > 0 && (
            <button
              type="button"
              onClick={() => onTeethChange([])}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
              {t('teethSelector.noTeethSelected').split('.')[0].includes('No') ? 'Clear all' : 'Počisti'}
            </button>
          )}
          <span className="font-medium text-gray-500">{tFdi('lowerJaw')}</span>
        </div>
      </div>

      {/* Arch chart */}
      <div className="px-4 pt-3 pb-2">
        {/* UPPER arch — items-end so arch offset (margin-bottom) lifts molars up */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', paddingBottom: '3px' }}>
          {q1.map(t => renderTooth(t, 'upper'))}
          {/* Midline: subtle dashed divider */}
          <div style={{ width: '8px', alignSelf: 'stretch', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1.5px dashed #D1D5DB' }} />
          </div>
          {q2.map(t => renderTooth(t, 'upper'))}
        </div>

        {/* Jaw separation — gum line */}
        <div style={{ margin: '0 4px 0 4px', borderTop: '2px dashed #E9EAEC' }} />

        {/* LOWER arch — items-start so arch offset (margin-top) drops molars down */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '2px', paddingTop: '3px' }}>
          {q4.map(t => renderTooth(t, 'lower'))}
          <div style={{ width: '8px', alignSelf: 'stretch', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1.5px dashed #D1D5DB' }} />
          </div>
          {q3.map(t => renderTooth(t, 'lower'))}
        </div>
      </div>

      {/* Hover tooltip bar */}
      <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/50 min-h-[26px] text-xs text-gray-500">
        {hoveredTooth ? (
          <>
            <span className="font-mono font-semibold text-gray-700">{hoveredTooth}</span>
            {' — '}
            {tFdi(`teeth.${hoveredTooth}`)}
            {(() => {
              const sel = selectedTeeth.find(t => t.toothNumber === hoveredTooth);
              if (!sel || readOnly) return null;
              if (implantMode) return <span className="ml-2 text-amber-500">(click to {sel.implant ? 'remove implant marker' : 'mark as implant'})</span>;
              return <span className="ml-2 text-gray-400">(click to {sel.workType === selectedWorkType ? 'deselect' : 'change type'})</span>;
            })()}
          </>
        ) : (
          <span className="text-gray-300">
            {!readOnly ? tFdi('helpClickTeeth') : ''}
          </span>
        )}
      </div>
    </div>
  );

  const shadeNotesElement = !readOnly && selectedTeeth.length > 0 && (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 space-y-1">
        <Label className="text-xs text-gray-500">{t('teethSelector.shadeLabel')}</Label>
        <Input
          value={editingShade}
          onChange={(e) => setEditingShade(e.target.value)}
          onBlur={handleShadeNotesUpdate}
          placeholder={t('teethSelector.shadePlaceholder')}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="text-xs text-gray-500">{t('teethSelector.notesLabel')}</Label>
        <Input
          value={editingNotes}
          onChange={(e) => setEditingNotes(e.target.value)}
          onBlur={handleShadeNotesUpdate}
          placeholder={t('teethSelector.notesPlaceholder')}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );

  const toolbarElement = !readOnly && (
    <WorkTypeToolbar
      selectedWorkType={selectedWorkType}
      onSelectWorkType={(wt) => { setSelectedWorkType(wt); setImplantMode(false); }}
      implantMode={implantMode}
      onToggleImplantMode={() => setImplantMode(m => !m)}
      disabled={readOnly}
    />
  );

  const sidebarElement = (
    <div className="space-y-3">
      {showLegend && <TeethLegend />}
      <SelectionSummary
        selectedTeeth={selectedTeeth}
        onRemoveTooth={readOnly ? undefined : handleToothRemove}
        readOnly={readOnly}
      />
      {!readOnly && selectedTeeth.length === 0 && (
        <p className="text-xs text-gray-400 text-center pt-2">
          {t('teethSelector.noTeethSelected')}
        </p>
      )}
    </div>
  );

  // ============================================================================
  // LAYOUT
  // ============================================================================

  if (layout === 'sidebar') {
    return (
      <div className={cn('teeth-selector w-full', className)}>
        {toolbarElement && <div className="mb-3">{toolbarElement}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
          <div className="space-y-3">
            {chartElement}
            {shadeNotesElement}
          </div>
          <div className="space-y-3">
            {sidebarElement}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('teeth-selector w-full', className)}>
      {toolbarElement && <div className="mb-3">{toolbarElement}</div>}
      {chartElement}
      {shadeNotesElement && <div className="mt-3">{shadeNotesElement}</div>}
      <div className="mt-3">{sidebarElement}</div>
    </div>
  );
}
