'use client';

/**
 * ToothElement — Individual tooth button (HTML/CSS, no SVG)
 *
 * Renders a single tooth as a styled HTML button with:
 * - Anatomically-inspired shape via border-radius (crown vs root end)
 * - Proportional sizing by tooth type (incisor/canine/premolar/molar)
 * - Arch-curve offset: central incisors sit at the arch midpoint,
 *   molars are elevated to simulate the curved jaw shape
 * - Number label outside the tooth (above for upper, below for lower)
 * - Color fill matching the assigned work type when selected
 */

import type { ToothData, WorkType } from './types';
import { WORK_TYPE_COLORS, IMPLANT_BADGE_COLOR } from './constants';

// ============================================================================
// TOOTH PROPORTIONS BY POSITION
// ============================================================================

/**
 * Visual config for each tooth position (1 = central incisor → 8 = wisdom)
 *
 * width/height: pixel dimensions of the tooth button
 * crownRadius: border-radius (px) on the occlusal/incisal side (crown end)
 * archOffset: margin-bottom (upper) or margin-top (lower) in px — creates arch curve
 */
const POSITION_CONFIG: Record<number, {
  width: number;
  height: number;
  crownRadius: number;
  archOffset: number;
}> = {
  1: { width: 19, height: 32, crownRadius: 9,  archOffset: 0  }, // central incisor
  2: { width: 17, height: 30, crownRadius: 8,  archOffset: 3  }, // lateral incisor
  3: { width: 17, height: 34, crownRadius: 11, archOffset: 7  }, // canine (tallest)
  4: { width: 20, height: 27, crownRadius: 7,  archOffset: 10 }, // first premolar
  5: { width: 20, height: 25, crownRadius: 6,  archOffset: 12 }, // second premolar
  6: { width: 24, height: 24, crownRadius: 5,  archOffset: 14 }, // first molar
  7: { width: 23, height: 23, crownRadius: 4,  archOffset: 15 }, // second molar
  8: { width: 21, height: 22, crownRadius: 4,  archOffset: 16 }, // wisdom tooth
};

// ============================================================================
// PROPS
// ============================================================================

export interface ToothElementProps {
  tooth: ToothData;
  jaw: 'upper' | 'lower';
  isSelected: boolean;
  isHovered: boolean;
  workType?: WorkType;
  implant?: boolean;
  onClick: (event?: React.MouseEvent) => void;
  onRightClick?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  disabled?: boolean;
  showLabel?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ToothElement({
  tooth,
  jaw,
  isSelected,
  isHovered,
  workType,
  implant = false,
  onClick,
  onRightClick,
  onMouseEnter,
  onMouseLeave,
  disabled = false,
  showLabel = true,
}: ToothElementProps) {
  const config = POSITION_CONFIG[tooth.position] ?? POSITION_CONFIG[6];

  // Fill: work-type color when selected, hover gray, default light gray
  const bgColor = isSelected && workType
    ? WORK_TYPE_COLORS[workType]
    : isHovered && !disabled
    ? '#D1D5DB'
    : '#F3F4F6';

  const borderColor = isSelected && workType
    ? 'rgba(0,0,0,0.2)'
    : isHovered && !disabled
    ? '#9CA3AF'
    : '#E5E7EB';

  // Crown (biting) end faces down on upper teeth, up on lower teeth
  const br = config.crownRadius;
  const borderRadius = jaw === 'upper'
    ? `3px 3px ${br}px ${br}px`
    : `${br}px ${br}px 3px 3px`;

  // Push tooth outward from midline to form arch curve
  const archStyle = jaw === 'upper'
    ? { marginBottom: `${config.archOffset}px` }
    : { marginTop: `${config.archOffset}px` };

  const numberStyle: React.CSSProperties = {
    fontSize: '8px',
    fontFamily: 'ui-monospace, monospace',
    color: isSelected ? '#374151' : '#9CA3AF',
    fontWeight: isSelected ? 600 : 400,
    lineHeight: 1,
    userSelect: 'none',
  };

  const implantArrow = implant ? (
    <span
      title="Implant"
      style={{
        display: 'block',
        textAlign: 'center',
        fontSize: '11px',
        lineHeight: 1,
        color: '#1a1a1a',
        pointerEvents: 'none',
        userSelect: 'none',
        fontWeight: 900,
      }}
    >
      {jaw === 'upper' ? '▼' : '▲'}
    </span>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', ...archStyle }}>
      {/* Number above — upper jaw only */}
      {showLabel && jaw === 'upper' && (
        <span style={numberStyle}>{tooth.number}</span>
      )}

      {/* Implant arrow — upper jaw: above tooth (between number and tooth) */}
      {jaw === 'upper' && implantArrow}

      {/* Tooth button */}
      <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
        <button
          type="button"
          onClick={disabled ? undefined : (e) => onClick(e)}
          onContextMenu={(e) => {
            if (!disabled && onRightClick && isSelected) {
              e.preventDefault();
              onRightClick();
            }
          }}
          onMouseEnter={disabled ? undefined : onMouseEnter}
          onMouseLeave={disabled ? undefined : onMouseLeave}
          aria-label={`Tooth ${tooth.number}`}
          aria-pressed={isSelected}
          disabled={disabled}
          style={{
            width: `${config.width}px`,
            height: `${config.height}px`,
            backgroundColor: bgColor,
            border: `${isSelected ? 2 : 1.5}px solid ${borderColor}`,
            borderRadius,
            cursor: disabled ? 'default' : 'pointer',
            transition: 'all 0.1s ease',
            transform: isHovered && !disabled ? 'scaleY(1.07)' : 'scaleY(1)',
            opacity: disabled ? 0.55 : 1,
            outline: 'none',
            padding: 0,
            display: 'block',
            boxShadow: isSelected
              ? `0 2px 6px ${bgColor}99`
              : isHovered && !disabled
              ? '0 1px 3px rgba(0,0,0,0.12)'
              : 'none',
          }}
        />
      </div>

      {/* Implant arrow — lower jaw: below tooth (between tooth and number) */}
      {jaw === 'lower' && implantArrow}

      {/* Number below — lower jaw only */}
      {showLabel && jaw === 'lower' && (
        <span style={numberStyle}>{tooth.number}</span>
      )}
    </div>
  );
}
