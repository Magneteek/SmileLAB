'use client';

/**
 * TeethSelector - FDI Tooth Notation Selector Component
 *
 * Main component implementing the FDI World Dental Federation two-digit
 * notation system (ISO 3950) for selecting teeth in dental worksheets.
 *
 * Features:
 * - Visual jaw diagram with 4 quadrants
 * - Support for permanent (32 teeth) and primary (20 teeth) dentition
 * - Interactive multi-tooth selection
 * - Work type assignment (crown, bridge, filling, implant, denture, etc.)
 * - Responsive design for desktop, tablet, and mobile
 * - Accessibility compliant (WCAG 2.1 AA)
 *
 * @example
 * ```tsx
 * const [selectedTeeth, setSelectedTeeth] = useState<ToothSelection[]>([]);
 *
 * <TeethSelector
 *   selectedTeeth={selectedTeeth}
 *   onTeethChange={setSelectedTeeth}
 *   mode="permanent"
 * />
 * ```
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TeethSelectorProps, ToothData, WorkType } from './types';
import { PERMANENT_TEETH, PRIMARY_TEETH, CANVAS_CONFIG } from './constants';
import { ToothElement } from './ToothElement';
import { WorkTypeToolbar } from './WorkTypeToolbar';
import { TeethLegend } from './TeethLegend';
import { SelectionSummary } from './SelectionSummary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paintbrush, FileText } from 'lucide-react';

/**
 * Main TeethSelector Component
 *
 * Displays an interactive dental chart allowing users to select teeth
 * and assign work types using the FDI notation system.
 */
export function TeethSelector({
  selectedTeeth = [],
  onTeethChange,
  mode = 'permanent',
  readOnly = false,
  className,
  showLegend = true,
  showLabels = true,
  layout = 'default', // 'default' or 'sidebar'
}: TeethSelectorProps & { layout?: 'default' | 'sidebar' }) {
  const t = useTranslations();
  const tFdi = useTranslations('fdi');

  // Local state for UI interactions
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('crown');
  const [lastClickedTooth, setLastClickedTooth] = useState<string | null>(null);
  const [editingShade, setEditingShade] = useState<string>('');
  const [editingToothShape, setEditingToothShape] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<string>('');

  /**
   * Get teeth based on current display mode
   */
  const displayTeeth = useMemo(() => {
    if (mode === 'primary') {
      return PRIMARY_TEETH;
    }
    if (mode === 'mixed') {
      return [...PERMANENT_TEETH, ...PRIMARY_TEETH];
    }
    return PERMANENT_TEETH; // Default: permanent
  }, [mode]);

  /**
   * Group teeth by quadrant for organized rendering
   */
  const teethByQuadrant = useMemo(() => {
    const grouped = new Map<number, ToothData[]>();

    displayTeeth.forEach((tooth) => {
      const existing = grouped.get(tooth.quadrant) || [];
      grouped.set(tooth.quadrant, [...existing, tooth]);
    });

    return grouped;
  }, [displayTeeth]);

  /**
   * Get teeth in range between two tooth numbers
   */
  const getTeethInRange = useCallback(
    (startTooth: string, endTooth: string): string[] => {
      // Find start and end indices in displayTeeth
      const startIndex = displayTeeth.findIndex((t) => t.number === startTooth);
      const endIndex = displayTeeth.findIndex((t) => t.number === endTooth);

      if (startIndex === -1 || endIndex === -1) return [];

      // Get all teeth between start and end (inclusive)
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      return displayTeeth.slice(minIndex, maxIndex + 1).map((t) => t.number);
    },
    [displayTeeth]
  );

  /**
   * Handle tooth click - applies selected work type from toolbar
   * Supports Shift+click for range selection
   */
  const handleToothClick = useCallback(
    (toothNumber: string, event?: React.MouseEvent) => {
      if (readOnly) return;

      const existing = selectedTeeth.find((t) => t.toothNumber === toothNumber);

      // Handle Shift+click for range selection
      if (event?.shiftKey && lastClickedTooth && lastClickedTooth !== toothNumber) {
        // Get all teeth in range
        const teethInRange = getTeethInRange(lastClickedTooth, toothNumber);

        // Add/update all teeth in range with current selected work type
        const updatedTeeth = [...selectedTeeth];

        teethInRange.forEach((tooth) => {
          const existingIndex = updatedTeeth.findIndex((t) => t.toothNumber === tooth);

          if (existingIndex !== -1) {
            // Update existing tooth with new work type
            updatedTeeth[existingIndex] = {
              ...updatedTeeth[existingIndex],
              workType: selectedWorkType,
            };
          } else {
            // Add new tooth
            updatedTeeth.push({ toothNumber: tooth, workType: selectedWorkType });
          }
        });

        onTeethChange(updatedTeeth);
        setLastClickedTooth(toothNumber);
        return;
      }

      // Normal click behavior
      if (existing) {
        // Already selected - update work type
        const updated = selectedTeeth.map((t) =>
          t.toothNumber === toothNumber ? { ...t, workType: selectedWorkType } : t
        );
        onTeethChange(updated);
      } else {
        // New selection - add with selected work type from toolbar
        onTeethChange([...selectedTeeth, { toothNumber, workType: selectedWorkType }]);
      }

      setLastClickedTooth(toothNumber);
    },
    [
      selectedTeeth,
      onTeethChange,
      readOnly,
      selectedWorkType,
      lastClickedTooth,
      getTeethInRange,
    ]
  );

  /**
   * Handle tooth removal (deselect)
   */
  const handleToothRemove = useCallback(
    (toothNumber: string) => {
      const filtered = selectedTeeth.filter((t) => t.toothNumber !== toothNumber);
      onTeethChange(filtered);
    },
    [selectedTeeth, onTeethChange]
  );

  /**
   * Handle shade and notes update for all selected teeth
   */
  const handleShadeNotesUpdate = useCallback(() => {
    if (selectedTeeth.length === 0) return;

    const updated = selectedTeeth.map((t) => ({
      ...t,
      shade: editingShade || t.shade,
      toothShape: editingToothShape || t.toothShape,
      notes: editingNotes || t.notes,
    }));
    onTeethChange(updated);
  }, [selectedTeeth, editingShade, editingToothShape, editingNotes, onTeethChange]);

  // Compact shade/notes editor (below canvas)
  const shadeNotesElement = !readOnly && selectedTeeth.length > 0 && (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-purple-600" />
          {t('teethSelector.shadeNotesTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Shade Input */}
          <div className="space-y-1.5">
            <Label htmlFor="global-shade" className="text-xs font-medium text-gray-700">
              {t('teethSelector.shadeLabel')}
            </Label>
            <Input
              id="global-shade"
              type="text"
              placeholder={t('teethSelector.shadePlaceholder')}
              value={editingShade}
              onChange={(e) => setEditingShade(e.target.value)}
              onBlur={handleShadeNotesUpdate}
              className="text-sm h-8"
            />
          </div>

          {/* Tooth Shape Input */}
          <div className="space-y-1.5">
            <Label htmlFor="global-tooth-shape" className="text-xs font-medium text-gray-700">
              {t('teethSelector.toothShapeLabel')}
            </Label>
            <Input
              id="global-tooth-shape"
              type="text"
              placeholder={t('teethSelector.toothShapePlaceholder')}
              value={editingToothShape}
              onChange={(e) => setEditingToothShape(e.target.value)}
              onBlur={handleShadeNotesUpdate}
              className="text-sm h-8"
            />
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <Label htmlFor="global-notes" className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {t('teethSelector.notesLabel')}
            </Label>
            <Input
              id="global-notes"
              type="text"
              placeholder={t('teethSelector.notesPlaceholder')}
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              onBlur={handleShadeNotesUpdate}
              className="text-sm h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render canvas component
  const canvasElement = (
    <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
        <svg
          viewBox={`0 0 ${CANVAS_CONFIG.width} ${CANVAS_CONFIG.height}`}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          role="application"
          aria-label="FDI Tooth Notation Selector"
        >
          {/* Background */}
          <rect
            width={CANVAS_CONFIG.width}
            height={CANVAS_CONFIG.height}
            fill="#F9FAFB"
          />

          {/* Upper Jaw Label */}
          <text
            x={CANVAS_CONFIG.width / 2}
            y={18}
            textAnchor="middle"
            className="text-sm font-semibold fill-gray-700"
            style={{ fontSize: '14px' }}
          >
            {tFdi('upperJaw')}
          </text>

          {/* Lower Jaw Label */}
          <text
            x={CANVAS_CONFIG.width / 2}
            y={CANVAS_CONFIG.height - 8}
            textAnchor="middle"
            className="text-sm font-semibold fill-gray-700"
            style={{ fontSize: '14px' }}
          >
            {tFdi('lowerJaw')}
          </text>

          {/* Midline Divider (Vertical) */}
          <line
            x1={CANVAS_CONFIG.width / 2}
            y1={CANVAS_CONFIG.padding}
            x2={CANVAS_CONFIG.width / 2}
            y2={CANVAS_CONFIG.height - CANVAS_CONFIG.padding}
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Horizontal Divider (Upper/Lower jaw separation) */}
          <line
            x1={CANVAS_CONFIG.padding}
            y1={CANVAS_CONFIG.height / 2}
            x2={CANVAS_CONFIG.width - CANVAS_CONFIG.padding}
            y2={CANVAS_CONFIG.height / 2}
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Quadrant Labels */}
          <g className="quadrant-labels opacity-50">
            {/* Quadrant 2 Label (Upper Left - appears on RIGHT side) */}
            <text
              x={CANVAS_CONFIG.width - CANVAS_CONFIG.padding - 5}
              y={38}
              textAnchor="end"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              Q2
            </text>

            {/* Quadrant 1 Label (Upper Right - appears on LEFT side) */}
            <text
              x={CANVAS_CONFIG.padding + 5}
              y={38}
              textAnchor="start"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              Q1
            </text>

            {/* Quadrant 3 Label (Lower Left - appears on RIGHT side) */}
            <text
              x={CANVAS_CONFIG.width - CANVAS_CONFIG.padding - 5}
              y={CANVAS_CONFIG.height - CANVAS_CONFIG.padding - 5}
              textAnchor="end"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              Q3
            </text>

            {/* Quadrant 4 Label (Lower Right - appears on LEFT side) */}
            <text
              x={CANVAS_CONFIG.padding + 5}
              y={CANVAS_CONFIG.height - CANVAS_CONFIG.padding - 5}
              textAnchor="start"
              className="text-xs fill-gray-500"
              style={{ fontSize: '10px' }}
            >
              Q4
            </text>
          </g>

          {/* Teeth - Grouped by Quadrant */}
          {Array.from(teethByQuadrant.entries()).map(([quadrant, teeth]) => (
            <g key={quadrant} id={`quadrant-${quadrant}`} className="quadrant-group">
              {teeth.map((tooth) => (
                <ToothElement
                  key={tooth.number}
                  tooth={tooth}
                  isSelected={selectedTeeth.some(
                    (t) => t.toothNumber === tooth.number
                  )}
                  isHovered={hoveredTooth === tooth.number}
                  workType={
                    selectedTeeth.find((t) => t.toothNumber === tooth.number)
                      ?.workType
                  }
                  onClick={(event) => handleToothClick(tooth.number, event)}
                  onRightClick={() => handleToothRemove(tooth.number)}
                  onMouseEnter={() => setHoveredTooth(tooth.number)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  disabled={readOnly}
                  showLabel={showLabels}
                />
              ))}
            </g>
          ))}

          {/* Tooltip for hovered tooth (optional enhancement) */}
          {hoveredTooth && !readOnly && (
            <g className="tooth-tooltip">
              <text
                x={CANVAS_CONFIG.width / 2}
                y={CANVAS_CONFIG.height / 2 - 20}
                textAnchor="middle"
                className="text-sm font-medium fill-gray-900"
                style={{ fontSize: '14px' }}
              >
                {tFdi(`teeth.${hoveredTooth}`)}
              </text>
            </g>
          )}
        </svg>
    </div>
  );

  // Render sidebar element (legend + summary)
  const sidebarElement = (
    <div className="space-y-3">
      {/* Legend */}
      {showLegend && <TeethLegend />}

      {/* Selection Summary */}
      <SelectionSummary
        selectedTeeth={selectedTeeth}
        onRemoveTooth={readOnly ? undefined : handleToothRemove}
        readOnly={readOnly}
      />

      {/* Responsive Text Hints */}
      {!readOnly && selectedTeeth.length === 0 && (
        <div className="text-xs text-gray-500 text-center mt-2">
          <p className="hidden md:block">
            Click a tooth to select and assign work type
          </p>
          <p className="md:hidden">Tap a tooth to select and assign work type</p>
        </div>
      )}
    </div>
  );

  // Render toolbar (common to both layouts)
  const toolbarElement = !readOnly && (
    <Card className="border-gray-200">
      <CardContent className="p-3">
        <WorkTypeToolbar
          selectedWorkType={selectedWorkType}
          onSelectWorkType={setSelectedWorkType}
          disabled={readOnly}
        />
      </CardContent>
    </Card>
  );

  // Return layout based on prop
  if (layout === 'sidebar') {
    return (
      <div className={cn('teeth-selector w-full', className)}>
        {/* Work Type Toolbar */}
        {toolbarElement && <div className="mb-3">{toolbarElement}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Canvas (50%) */}
          <div className="space-y-3">
            {canvasElement}
          </div>

          {/* Right: Shade/Notes + Sidebar (50%) */}
          <div className="space-y-3">
            {shadeNotesElement}
            {sidebarElement}
          </div>
        </div>
      </div>
    );
  }

  // Default stacked layout
  return (
    <div className={cn('teeth-selector w-full', className)}>
      {/* Work Type Toolbar */}
      {toolbarElement && <div className="mb-3">{toolbarElement}</div>}

      {/* Canvas */}
      {canvasElement}

      {/* Shade & Notes Section */}
      {shadeNotesElement && <div className="mt-3">{shadeNotesElement}</div>}

      {/* Legend and Summary */}
      <div className="mt-3">{sidebarElement}</div>
    </div>
  );
}
