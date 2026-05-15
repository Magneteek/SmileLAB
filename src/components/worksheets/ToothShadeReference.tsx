'use client';

/**
 * ToothShadeReference — Compact standalone tooth shade reference card
 *
 * SVG tooth split into incisal (top) and cervical (bottom) color zones.
 * Two VITA shade pickers, one per zone. Technician reference only.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VITA_CLASSICAL_SHADES, VITA_3D_MASTER_SHADES } from './TeethSelector/constants';

// ============================================================================
// VITA SHADE COLORS
// ============================================================================

const VITA_COLORS: Record<string, string> = {
  A1: '#F5E6C4', A2: '#F0D9A0', A3: '#E8CA78', 'A3.5': '#E0BE60', A4: '#D4A840',
  B1: '#F5EAD0', B2: '#EFDFB5', B3: '#E8D095', B4: '#D8BC70',
  C1: '#F0E5D5', C2: '#E6D5B8', C3: '#D8C49A', C4: '#C8B080',
  D2: '#EDD8B8', D3: '#E0C890', D4: '#CEB278',
  '0M1': '#F7EDD8', '0M2': '#F5E5C8', '0M3': '#F0DDB8',
  '1M1': '#F2E4C0', '1M2': '#EDD9A8',
  '2L1.5': '#EEDD98', '2L2.5': '#EAD490', '2M1': '#EDD89C', '2M2': '#E8CF88',
  '2M3': '#E3C870', '2R1.5': '#EAD594', '2R2.5': '#E5CD80',
  '3L1.5': '#E8CF84', '3L2.5': '#E3C870', '3M1': '#E8CC80', '3M2': '#E3C268',
  '3M3': '#DCBA58', '3R1.5': '#E5C97C', '3R2.5': '#DFC070',
  '4L1.5': '#E2C874', '4L2.5': '#DBC060', '4M1': '#E2C570', '4M2': '#DCBC5C',
  '4M3': '#D4B04A', '4R1.5': '#DEC26C', '4R2.5': '#D8B858',
  '5M1': '#DBBC60', '5M2': '#D4B24C', '5M3': '#CCA83C',
};

function getShadeColor(shade: string | null): string {
  if (!shade) return '#F3F4F6';
  return VITA_COLORS[shade] ?? '#F0E6D0';
}

// ============================================================================
// SVG TOOTH
// ============================================================================

const TOOTH_PATH =
  'M 14,25 C 14,20 18,17 40,17 C 62,17 66,20 66,25 L 66,65 C 66,70 62,72 58,72 L 55,115 C 55,122 50,127 46,127 L 40,128 L 34,127 C 30,127 25,122 25,115 L 22,72 C 18,72 14,70 14,65 Z';

function ToothSvg({ incisalShade, cervicalShade }: { incisalShade: string | null; cervicalShade: string | null }) {
  const ic = getShadeColor(incisalShade);
  const cv = getShadeColor(cervicalShade);
  return (
    <svg viewBox="0 0 80 145" width="72" height="130" style={{ display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}>
      <defs>
        <clipPath id="tsr-i"><path d="M 0,0 L 80,0 L 80,63 L 0,63 Z" /></clipPath>
        <clipPath id="tsr-c"><path d="M 0,63 L 80,63 L 80,145 L 0,145 Z" /></clipPath>
        <linearGradient id="tsr-ig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tsr-cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g clipPath="url(#tsr-c)">
        <path d={TOOTH_PATH} fill={cv} />
        <path d={TOOTH_PATH} fill="url(#tsr-cg)" />
      </g>
      <g clipPath="url(#tsr-i)">
        <path d={TOOTH_PATH} fill={ic} />
        <path d={TOOTH_PATH} fill="url(#tsr-ig)" />
      </g>
      <line x1="14" y1="63" x2="66" y2="63" stroke="rgba(0,0,0,0.12)" strokeWidth="1" strokeDasharray="3 2" />
      <path d={TOOTH_PATH} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
    </svg>
  );
}

// ============================================================================
// SHADE PICKER BUTTON
// ============================================================================

function ShadePicker({
  value, onChange, label, disabled,
}: {
  value: string | null;
  onChange: (shade: string | null) => void;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'classical' | '3d'>('classical');

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1.5 text-xs font-medium px-2 min-w-[64px] justify-start"
          >
            <span
              className="w-3.5 h-3.5 rounded-sm border border-gray-200 shrink-0"
              style={{ backgroundColor: getShadeColor(value) }}
            />
            <span className="text-gray-600">{value ?? <span className="text-gray-300 text-[10px]">—</span>}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="bottom" className="w-[min(256px,calc(100vw-2rem))] p-2">
          <div className="flex rounded border border-gray-200 mb-2 overflow-hidden text-[10px]">
            <button type="button" onClick={() => setTab('classical')}
              className={cn('flex-1 py-1 font-medium transition-colors', tab === 'classical' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              VITA Classical
            </button>
            <button type="button" onClick={() => setTab('3d')}
              className={cn('flex-1 py-1 font-medium transition-colors', tab === '3d' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              3D-Master
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {(tab === 'classical' ? VITA_CLASSICAL_SHADES : VITA_3D_MASTER_SHADES).map((shade) => (
              <button key={shade} type="button" title={shade}
                onClick={() => { onChange(value === shade ? null : shade); setOpen(false); }}
                className={cn('flex flex-col items-center gap-0.5 p-0.5 rounded hover:bg-gray-100 transition-colors',
                  value === shade && 'ring-2 ring-blue-500 bg-blue-50')}>
                <span className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: getShadeColor(shade) }} />
                <span className="text-[7px] text-gray-500 leading-none">{shade}</span>
              </button>
            ))}
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(null); setOpen(false); }}
              className="mt-1.5 w-full text-[10px] text-red-400 hover:text-red-600 py-0.5 hover:bg-red-50 rounded transition-colors">
              Clear
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface ToothShadeReferenceProps {
  shadeIncisal?: string | null;
  shadeCervical?: string | null;
  onChange?: (shadeIncisal: string | null, shadeCervical: string | null) => void;
  readOnly?: boolean;
}

export function ToothShadeReference({
  shadeIncisal = null,
  shadeCervical = null,
  onChange,
  readOnly = false,
}: ToothShadeReferenceProps) {
  const t = useTranslations('toothShadeReference');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{t('title')}</div>
      <div className="flex items-center justify-center gap-4">
        <ShadePicker
          value={shadeIncisal ?? null}
          onChange={(v) => onChange?.(v, shadeCervical ?? null)}
          label={t('incisalLabel')}
          disabled={readOnly}
        />
        <ToothSvg incisalShade={shadeIncisal ?? null} cervicalShade={shadeCervical ?? null} />
        <ShadePicker
          value={shadeCervical ?? null}
          onChange={(v) => onChange?.(shadeIncisal ?? null, v)}
          label={t('cervicalLabel')}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
