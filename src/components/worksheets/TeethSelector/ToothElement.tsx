'use client';

/**
 * ToothElement - Individual Tooth SVG Component
 *
 * Renders a single tooth in the FDI notation system with:
 * - Anatomically accurate dimensions
 * - Interactive states (hover, selected)
 * - Work type color coding
 * - Tooth number label
 * - Accessibility support
 */

import { useMemo } from 'react';
import type { ToothData, WorkType } from './types';
import {
  WORK_TYPE_COLORS,
  TOOTH_COLORS,
  CANVAS_CONFIG,
} from './constants';
import { getToothCoordinates, getToothDimensions } from './utils';

export interface ToothElementProps {
  /** Tooth data (FDI notation and metadata) */
  tooth: ToothData;

  /** Whether this tooth is currently selected */
  isSelected: boolean;

  /** Whether this tooth is currently hovered */
  isHovered: boolean;

  /** Work type assigned to this tooth (if selected) */
  workType?: WorkType;

  /** Click handler for tooth selection */
  onClick: () => void;

  /** Right-click handler for tooth deselection */
  onRightClick?: () => void;

  /** Mouse enter handler for hover state */
  onMouseEnter: () => void;

  /** Mouse leave handler for hover state */
  onMouseLeave: () => void;

  /** Whether interaction is disabled (read-only mode) */
  disabled?: boolean;

  /** Whether to show tooth number label */
  showLabel?: boolean;
}

/**
 * ToothElement Component
 *
 * Renders an individual tooth as an SVG element with proper positioning,
 * sizing, and styling based on FDI notation and current state.
 */
export function ToothElement({
  tooth,
  isSelected,
  isHovered,
  workType,
  onClick,
  onRightClick,
  onMouseEnter,
  onMouseLeave,
  disabled = false,
  showLabel = true,
}: ToothElementProps) {
  /**
   * Calculate tooth position and dimensions
   * Memoized to avoid recalculation on every render
   */
  const coordinates = useMemo(
    () => getToothCoordinates(tooth, CANVAS_CONFIG.width, CANVAS_CONFIG.height),
    [tooth]
  );

  const dimensions = useMemo(() => getToothDimensions(tooth), [tooth]);

  /**
   * Determine fill color based on state
   * Priority: work type color > selected > hover > default
   */
  const fillColor = useMemo(() => {
    if (isSelected && workType) {
      return WORK_TYPE_COLORS[workType];
    }
    if (isSelected) {
      return TOOTH_COLORS.selected;
    }
    if (isHovered && !disabled) {
      return TOOTH_COLORS.hover;
    }
    return TOOTH_COLORS.default;
  }, [isSelected, isHovered, workType, disabled]);

  /**
   * Determine border color and width
   */
  const strokeColor = isHovered && !disabled
    ? TOOTH_COLORS.borderHover
    : TOOTH_COLORS.border;

  const strokeWidth = isHovered && !disabled ? 2.5 : 1.5;

  /**
   * Determine opacity
   */
  const opacity = disabled ? 0.5 : isSelected ? 1 : 0.85;

  /**
   * Calculate text color for readability
   * Use white text on dark backgrounds, dark text on light backgrounds
   */
  const textColor = isSelected && workType ? '#FFFFFF' : TOOTH_COLORS.text;

  /**
   * Calculate text position (centered on tooth)
   */
  const textX = coordinates.x + coordinates.width / 2;
  const textY = coordinates.y + coordinates.height / 2 + 4; // +4 for vertical centering

  return (
    <g
      className={`tooth-element ${disabled ? 'cursor-default' : 'cursor-pointer'} transition-all duration-150`}
      onClick={disabled ? undefined : onClick}
      onContextMenu={(e) => {
        if (!disabled && onRightClick && isSelected) {
          e.preventDefault();
          onRightClick();
        }
      }}
      onMouseEnter={disabled ? undefined : onMouseEnter}
      onMouseLeave={disabled ? undefined : onMouseLeave}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Tooth ${tooth.number}, ${tooth.name}${
        workType ? `, ${workType}` : ''
      }`}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Tooth Shape (Rounded Rectangle) */}
      <rect
        x={coordinates.x}
        y={coordinates.y}
        width={coordinates.width}
        height={coordinates.height}
        rx={5} // Rounded corners
        ry={5}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        className="tooth-shape transition-all duration-150"
        style={{
          filter: isHovered && !disabled
            ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            : 'none',
        }}
      />

      {/* Tooth Number Label */}
      {showLabel && (
        <text
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-semibold select-none pointer-events-none"
          fill={textColor}
          style={{
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {tooth.number}
        </text>
      )}

      {/* Selection Indicator (checkmark for selected teeth) */}
      {isSelected && (
        <g className="selection-indicator">
          {/* Small circle badge in top-right corner */}
          <circle
            cx={coordinates.x + coordinates.width - 8}
            cy={coordinates.y + 8}
            r={6}
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          {/* Checkmark */}
          <path
            d={`M ${coordinates.x + coordinates.width - 10} ${coordinates.y + 8}
                L ${coordinates.x + coordinates.width - 8} ${coordinates.y + 10}
                L ${coordinates.x + coordinates.width - 5} ${coordinates.y + 6}`}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Hover Highlight Effect */}
      {isHovered && !disabled && (
        <rect
          x={coordinates.x - 2}
          y={coordinates.y - 2}
          width={coordinates.width + 4}
          height={coordinates.height + 4}
          rx={7}
          ry={7}
          fill="none"
          stroke={TOOTH_COLORS.borderHover}
          strokeWidth={2}
          opacity={0.5}
          className="hover-highlight animate-pulse"
        />
      )}
    </g>
  );
}
