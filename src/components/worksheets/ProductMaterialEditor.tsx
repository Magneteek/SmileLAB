/**
 * Product Material Editor Component
 *
 * Manages material assignments for a single product with support for:
 * - Multiple instances of same material (different LOTs)
 * - LOT selection with inline "Add LOT" form (no dialog context switch needed)
 * - Searchable material combobox (name only, no code)
 * - Tooth association (FDI notation)
 * - Notes/clarification per instance
 * - Progressive disclosure UI (expandable sections)
 * - Duplicate detection with confirmation
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ProductMaterialInstance } from '@/src/types/worksheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Copy, AlertTriangle, Package, Loader2, AlertCircle, ChevronDown, Camera } from 'lucide-react';
import type { MaterialType } from '@prisma/client';
import { OCRScanner, type OCRResult } from '@/components/materials/OCRScanner';

// ============================================================================
// TYPES
// ============================================================================

interface AvailableMaterial {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  availableStock: number;
  lots: Array<{
    id: string;
    lotNumber: string;
    quantityAvailable: number;
    expiryDate: string | null;
    arrivalDate: string;
    status: string;
  }>;
}

interface InlineLotState {
  instanceIndex: number;
  lotNumber: string;
  quantity: string;
  supplierName: string;
  expiryDate: string;
  submitting: boolean;
  error: string | null;
  showScanner: boolean;
}

interface ProductMaterialEditorProps {
  productId: string;
  productName: string;
  materials: ProductMaterialInstance[];
  availableMaterials: AvailableMaterial[];
  availableTeeth: string[];
  onChange: (materials: ProductMaterialInstance[]) => void;
  onMaterialCreated?: (material: AvailableMaterial) => void;
  readOnly?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductMaterialEditor({
  productId,
  productName,
  materials,
  availableMaterials,
  availableTeeth,
  onChange,
  onMaterialCreated,
  readOnly = false,
}: ProductMaterialEditorProps) {
  const t = useTranslations();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    show: boolean;
    materialId: string;
    materialName: string;
    lotId?: string;
  } | null>(null);

  // Material combobox state
  const [materialComboOpen, setMaterialComboOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // LOT combobox state (one open at a time, tracked by instance index)
  const [openLotIndex, setOpenLotIndex] = useState<number | null>(null);
  const [lotSearch, setLotSearch] = useState('');
  const lotDropdownRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Inline LOT add state
  const [inlineLotAdd, setInlineLotAdd] = useState<InlineLotState | null>(null);

  // Focus search when combobox opens
  useEffect(() => {
    if (materialComboOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setMaterialSearch('');
    }
  }, [materialComboOpen]);

  // Close LOT dropdown on outside click
  useEffect(() => {
    if (openLotIndex === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const ref = lotDropdownRefs.current.get(openLotIndex);
      if (ref && !ref.contains(e.target as Node)) {
        setOpenLotIndex(null);
        setLotSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openLotIndex]);

  const filteredMaterials = availableMaterials.filter(m =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    m.code.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // ============================================================================
  // MATERIAL INSTANCE ACTIONS
  // ============================================================================

  const addMaterial = (materialId: string, checkDuplicate: boolean = true) => {
    const materialInfo = availableMaterials.find(m => m.materialId === materialId);
    if (!materialInfo) return;

    if (checkDuplicate) {
      const hasDuplicate = materials.some(m =>
        m.materialId === materialId && !m.materialLotId
      );
      if (hasDuplicate) {
        setDuplicateAlert({
          show: true,
          materialId,
          materialName: materialInfo.name,
          lotId: undefined,
        });
        return;
      }
    }

    const oldestLot = materialInfo.lots && materialInfo.lots.length > 0
      ? materialInfo.lots[0]
      : null;

    const newInstance: ProductMaterialInstance = {
      materialId,
      materialLotId: oldestLot?.id,
      quantityUsed: 1,
      toothNumber: undefined,
      notes: undefined,
      position: materials.length + 1,
    };

    onChange([...materials, newInstance]);
  };

  const confirmDuplicateAdd = () => {
    if (duplicateAlert) {
      addMaterial(duplicateAlert.materialId, false);
      setDuplicateAlert(null);
    }
  };

  const duplicateInstance = (index: number) => {
    const instance = materials[index];
    onChange([...materials, {
      ...instance,
      materialLotId: undefined,
      position: materials.length + 1,
      notes: instance.notes ? `${instance.notes} (copy)` : undefined,
    }]);
  };

  const removeInstance = (index: number) => {
    onChange(materials.filter((_, i) => i !== index));
    if (inlineLotAdd?.instanceIndex === index) setInlineLotAdd(null);
  };

  const updateInstance = (index: number, updates: Partial<ProductMaterialInstance>) => {
    onChange(materials.map((mat, i) => (i === index ? { ...mat, ...updates } : mat)));
  };

  const getMaterialInfo = (materialId: string) =>
    availableMaterials.find(m => m.materialId === materialId);

  const getLotInfo = (materialId: string, lotId: string | undefined) => {
    if (!lotId) return null;
    return getMaterialInfo(materialId)?.lots.find(l => l.id === lotId) ?? null;
  };

  const isMissingLot = (instance: ProductMaterialInstance) => !instance.materialLotId;

  // ============================================================================
  // INLINE LOT ADD
  // ============================================================================

  const openInlineLotAdd = (instanceIndex: number) => {
    setInlineLotAdd({
      instanceIndex,
      lotNumber: '',
      quantity: '1',
      supplierName: '',
      expiryDate: '',
      submitting: false,
      error: null,
      showScanner: false,
    });
  };

  const submitInlineLot = async () => {
    if (!inlineLotAdd) return;
    const { instanceIndex, lotNumber, quantity, supplierName, expiryDate } = inlineLotAdd;
    const instance = materials[instanceIndex];

    if (!lotNumber.trim()) {
      setInlineLotAdd(prev => prev ? { ...prev, error: 'LOT številka je obvezna' } : null);
      return;
    }

    setInlineLotAdd(prev => prev ? { ...prev, submitting: true, error: null } : null);

    try {
      const res = await fetch(`/api/materials/${instance.materialId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotNumber: lotNumber.trim(),
          quantityReceived: parseFloat(quantity) || 1,
          supplierName: supplierName.trim() || 'Unknown',
          arrivalDate: new Date(),
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Napaka pri ustvarjanju LOT-a');
      }

      const lotResult = await res.json();

      // Auto-select the new lot on this instance
      updateInstance(instanceIndex, { materialLotId: lotResult.id });

      // Notify parent to refresh available materials
      const materialInfo = getMaterialInfo(instance.materialId);
      if (materialInfo && onMaterialCreated) {
        const newLot = {
          id: lotResult.id,
          lotNumber: lotNumber.trim(),
          quantityAvailable: parseFloat(quantity) || 1,
          expiryDate: expiryDate || null,
          arrivalDate: new Date().toISOString(),
          status: 'AVAILABLE',
        };
        onMaterialCreated({
          ...materialInfo,
          availableStock: materialInfo.availableStock + (parseFloat(quantity) || 1),
          lots: [...materialInfo.lots, newLot],
        });
      }

      setInlineLotAdd(null);
    } catch (err: any) {
      setInlineLotAdd(prev =>
        prev ? { ...prev, submitting: false, error: err.message || 'Napaka' } : null
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-2">
      {/* Header row: label (only when has materials) + missing badge + add button */}
      <div className="flex items-center gap-1.5">
        {materials.length > 0 && (
          <Label className="text-xs font-medium text-gray-600 flex-1">
            {t('productMaterialEditor.materialsUsedTitle', { count: materials.length })}
          </Label>
        )}
        {materials.length === 0 && <div className="flex-1" />}

        {materials.filter(isMissingLot).length > 0 && (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {materials.filter(isMissingLot).length} {t('productMaterialEditor.withoutLot')}
          </Badge>
        )}

        {!readOnly && (
          <>
            {/* Searchable combobox trigger — compact button */}
            <Popover open={materialComboOpen} onOpenChange={setMaterialComboOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj surovino
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[min(320px,calc(100vw-1rem))]"
                align="end"
              >
                <div className="p-2 border-b">
                  <Input
                    ref={searchRef}
                    placeholder="Iskanje surovine..."
                    value={materialSearch}
                    onChange={e => setMaterialSearch(e.target.value)}
                    className="h-8 text-sm bg-white"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {filteredMaterials.length > 0 ? filteredMaterials.map(mat => (
                    <button
                      key={mat.materialId}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center justify-between gap-2"
                      onClick={() => {
                        addMaterial(mat.materialId);
                        setMaterialComboOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">{mat.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        {mat.availableStock} {mat.unit}
                        {mat.lots.length === 0 && <span className="text-amber-500">• brez LOT</span>}
                      </span>
                    </button>
                  )) : (
                    <p className="px-3 py-3 text-sm text-muted-foreground">Ni rezultatov</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
              onClick={() => setShowCreateDialog(true)}
              title="Ustvari novo surovino"
            >
              <Package className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Material Instances */}
      <div className="space-y-1.5">
        {materials.length > 0 && (
          materials.map((instance, index) => {
            const materialInfo = getMaterialInfo(instance.materialId);
            const lotInfo = getLotInfo(instance.materialId, instance.materialLotId);
            const isAddingLot = inlineLotAdd?.instanceIndex === index;

            return (
              <Collapsible key={index} defaultOpen={isMissingLot(instance)}>
                <div className="border rounded-md bg-white overflow-hidden">
                  {/* Collapsed header */}
                  <CollapsibleTrigger asChild>
                    <div className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-xs flex-1 truncate">
                          {materialInfo?.name}
                        </span>

                        {/* Quantity — prominent in header */}
                        <span className="shrink-0 font-semibold text-sm text-gray-800">
                          {instance.quantityUsed}
                          <span className="text-xs font-normal text-gray-500 ml-0.5">{materialInfo?.unit}</span>
                        </span>

                        {lotInfo
                          ? <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block truncate max-w-[80px]">LOT {lotInfo.lotNumber}</span>
                          : <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300 shrink-0">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              {t('productMaterialEditor.noLotBadge')}
                            </Badge>
                        }

                        {!readOnly && (
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => duplicateInstance(index)} className="h-8 w-8 p-0" title={t('productMaterialEditor.duplicateTitle')}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeInstance(index)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" title={t('productMaterialEditor.removeTitle')}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Expanded details */}
                  <CollapsibleContent className="border-t px-3 pt-3 pb-3 space-y-3 bg-gray-50/50">

                    {/* Row 1: Quantity (prominent) + Tooth */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Quantity — first and large */}
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Količina ({materialInfo?.unit})
                        </Label>
                        <Input
                          type="number" step="0.001" min="0.001"
                          value={instance.quantityUsed}
                          onChange={e => updateInstance(index, { quantityUsed: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          className="h-10 text-base font-semibold bg-white border-2 border-gray-300 focus:border-primary"
                        />
                      </div>

                      {/* Tooth */}
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                          {t('productMaterialEditor.toothFieldLabel')}
                        </Label>
                        {readOnly ? (
                          <div className="h-10 text-sm flex items-center px-3 border rounded-md bg-white text-gray-700">
                            {instance.toothNumber || '—'}
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="h-10 w-full text-sm flex items-center justify-between px-3 border-2 border-gray-300 rounded-md bg-white hover:bg-gray-50 text-left">
                                <span className="truncate text-gray-700">
                                  {instance.toothNumber
                                    ? instance.toothNumber.split(',').join(', ')
                                    : <span className="text-gray-400">{t('productMaterialEditor.selectPlaceholder')}</span>}
                                </span>
                                <span className="ml-1 text-gray-400 shrink-0">▾</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-2" align="start">
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {availableTeeth.map(tooth => {
                                  const selected = (instance.toothNumber || '').split(',').filter(Boolean).includes(tooth);
                                  return (
                                    <label key={tooth} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                                      <Checkbox
                                        checked={selected}
                                        onCheckedChange={checked => {
                                          const current = (instance.toothNumber || '').split(',').filter(Boolean);
                                          const next = checked
                                            ? [...current, tooth].sort((a, b) => parseInt(a) - parseInt(b))
                                            : current.filter(v => v !== tooth);
                                          updateInstance(index, { toothNumber: next.length ? next.join(',') : undefined });
                                        }}
                                      />
                                      {tooth}
                                    </label>
                                  );
                                })}
                                {availableTeeth.length === 0 && (
                                  <p className="text-xs text-gray-400 px-1">{t('productMaterialEditor.noToothOption')}</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>

                    {/* Row 2: LOT Selection — full width */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-gray-700">
                          {t('productMaterialEditor.lotFieldLabel')}
                        </Label>
                        {!readOnly && !isAddingLot && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            title="Dodaj LOT"
                            onClick={() => openInlineLotAdd(index)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {readOnly ? (
                        <div className="h-9 text-sm flex items-center px-3 border rounded-md bg-white text-gray-700">
                          {lotInfo
                            ? <><span className="font-medium">{lotInfo.lotNumber}</span><span className="text-xs text-gray-500 ml-2">{lotInfo.quantityAvailable} {materialInfo?.unit}{lotInfo.expiryDate && ` • ${new Date(lotInfo.expiryDate).toLocaleDateString('sl-SI')}`}</span></>
                            : <span className="text-gray-400">{t('productMaterialEditor.selectLotPlaceholder')}</span>}
                        </div>
                      ) : (() => {
                        const lots = materialInfo?.lots ?? [];
                        const filteredLots = openLotIndex === index && lotSearch
                          ? lots.filter(l => l.lotNumber.toLowerCase().includes(lotSearch.toLowerCase()))
                          : lots;
                        return (
                          <div ref={el => { lotDropdownRefs.current.set(index, el); }}>
                            <button
                              type="button"
                              className="w-full h-9 text-sm border border-input rounded-md px-3 flex items-center justify-between bg-white hover:bg-gray-50"
                              onClick={() => {
                                setOpenLotIndex(openLotIndex === index ? null : index);
                                setLotSearch('');
                              }}
                            >
                              {lotInfo ? (
                                <span className="flex-1 text-left truncate">
                                  <span className="font-medium">{lotInfo.lotNumber}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {lotInfo.quantityAvailable} {materialInfo?.unit}
                                    {lotInfo.expiryDate && ` • ${new Date(lotInfo.expiryDate).toLocaleDateString('sl-SI')}`}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t('productMaterialEditor.selectLotPlaceholder')}</span>
                              )}
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                            </button>
                            {openLotIndex === index && (
                              <div className="mt-1 border border-input rounded-md bg-white shadow-sm">
                                <div className="p-2 border-b">
                                  <Input
                                    autoFocus
                                    placeholder="Iskanje LOT..."
                                    value={lotSearch}
                                    onChange={e => setLotSearch(e.target.value)}
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="max-h-44 overflow-y-auto py-1">
                                  {filteredLots.length > 0 ? filteredLots.map(lot => (
                                    <button
                                      key={lot.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center justify-between gap-2"
                                      onClick={() => {
                                        updateInstance(index, { materialLotId: lot.id });
                                        setOpenLotIndex(null);
                                        setLotSearch('');
                                      }}
                                    >
                                      <span className="font-medium">{lot.lotNumber}</span>
                                      <span className="text-gray-500 shrink-0">
                                        {lot.quantityAvailable} {materialInfo?.unit}
                                        {lot.expiryDate && ` • ${new Date(lot.expiryDate).toLocaleDateString('sl-SI')}`}
                                      </span>
                                    </button>
                                  )) : (
                                    <p className="px-3 py-2 text-xs text-muted-foreground">
                                      {lots.length === 0 ? 'Ni LOT-ov — dodajte spodaj' : 'Ni rezultatov'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                        {/* OCR Scanner (rendered outside inline form to avoid stacking contexts) */}
                        {isAddingLot && inlineLotAdd?.showScanner && (
                          <OCRScanner
                            isOpen
                            onClose={() => setInlineLotAdd(prev => prev ? { ...prev, showScanner: false } : null)}
                            onScan={(result: OCRResult) => {
                              setInlineLotAdd(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  showScanner: false,
                                  lotNumber: result.lotNumber || prev.lotNumber,
                                  quantity: result.quantity ? String(result.quantity) : prev.quantity,
                                  expiryDate: result.expiryDate
                                    ? result.expiryDate.toISOString().split('T')[0]
                                    : prev.expiryDate,
                                };
                              });
                            }}
                            title="Skeniraj LOT etiketo"
                            description="Usmerite kamero na etiketo materiala"
                          />
                        )}

                        {/* Inline Add LOT Form */}
                        {isAddingLot && inlineLotAdd && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-medium text-blue-800">Nov LOT</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-1 bg-white"
                                onClick={() => setInlineLotAdd(prev => prev ? { ...prev, showScanner: true } : null)}
                              >
                                <Camera className="h-3 w-3" /> Skeniraj
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <Label className="text-[10px] text-gray-600">LOT št. *</Label>
                                <Input
                                  className="h-7 text-xs mt-0.5"
                                  placeholder="npr. LOT2026-042"
                                  value={inlineLotAdd.lotNumber}
                                  onChange={e => setInlineLotAdd(prev => prev ? { ...prev, lotNumber: e.target.value } : null)}
                                  autoFocus
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-600">Količina *</Label>
                                <Input
                                  className="h-7 text-xs mt-0.5"
                                  type="number" min="0.001" step="0.001"
                                  value={inlineLotAdd.quantity}
                                  onChange={e => setInlineLotAdd(prev => prev ? { ...prev, quantity: e.target.value } : null)}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <Label className="text-[10px] text-gray-600">Dobavitelj</Label>
                                <Input
                                  className="h-7 text-xs mt-0.5"
                                  placeholder="Dobavitelj"
                                  value={inlineLotAdd.supplierName}
                                  onChange={e => setInlineLotAdd(prev => prev ? { ...prev, supplierName: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-600">Rok trajanja</Label>
                                <Input
                                  className="h-7 text-xs mt-0.5"
                                  type="date"
                                  value={inlineLotAdd.expiryDate}
                                  onChange={e => setInlineLotAdd(prev => prev ? { ...prev, expiryDate: e.target.value } : null)}
                                />
                              </div>
                            </div>
                            {inlineLotAdd.error && (
                              <p className="text-[10px] text-red-600">{inlineLotAdd.error}</p>
                            )}
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => setInlineLotAdd(null)}
                                disabled={inlineLotAdd.submitting}
                              >
                                Prekliči
                              </Button>
                              <Button
                                type="button" size="sm"
                                className="h-6 text-xs px-2"
                                onClick={submitInlineLot}
                                disabled={inlineLotAdd.submitting}
                              >
                                {inlineLotAdd.submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                Shrani LOT
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Row 3: Notes */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                        {t('productMaterialEditor.notesFieldLabel')}
                      </Label>
                      <Textarea
                        value={instance.notes || ''}
                        onChange={e => updateInstance(index, { notes: e.target.value || undefined })}
                        disabled={readOnly}
                        placeholder={t('productMaterialEditor.notesPlaceholder')}
                        className="h-14 text-sm resize-none bg-white"
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Duplicate Confirmation */}
      <AlertDialog open={duplicateAlert?.show || false} onOpenChange={open => !open && setDuplicateAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('productMaterialEditor.duplicateDialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('productMaterialEditor.duplicateDialogDescription', { materialName: duplicateAlert?.materialName || '' })
                .split('<br />').map((line, i) => <span key={i} dangerouslySetInnerHTML={{ __html: line }} />)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('productMaterialEditor.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicateAdd}>
              {t('productMaterialEditor.addAnywayButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Material Dialog */}
      <QuickCreateMaterialDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={newMat => {
          setShowCreateDialog(false);
          if (onMaterialCreated) onMaterialCreated(newMat);
          onChange([...materials, {
            materialId: newMat.materialId,
            materialLotId: newMat.lots[0]?.id,
            quantityUsed: 1,
            toothNumber: undefined,
            notes: undefined,
            position: materials.length + 1,
          }]);
        }}
      />
    </div>
  );
}

// ============================================================================
// QUICK CREATE MATERIAL DIALOG
// ============================================================================

const MATERIAL_TYPES_LIST: MaterialType[] = [
  'CERAMIC', 'METAL', 'RESIN', 'COMPOSITE', 'PORCELAIN',
  'ZIRCONIA', 'TITANIUM', 'ALLOY', 'ACRYLIC', 'WAX', 'OTHER',
];

interface QuickCreateMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (material: {
    materialId: string; code: string; name: string; unit: string;
    availableStock: number;
    lots: Array<{ id: string; lotNumber: string; quantityAvailable: number; expiryDate: string | null; arrivalDate: string; status: string }>;
  }) => void;
}

function QuickCreateMaterialDialog({ isOpen, onClose, onSuccess }: QuickCreateMaterialDialogProps) {
  const [tab, setTab] = useState<'new' | 'lot'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // LOT tab: searchable material list
  const [allMaterials, setAllMaterials] = useState<Array<{ id: string; code: string; name: string; unit: string }>>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [matSearch, setMatSearch] = useState('');
  const [matDropOpen, setMatDropOpen] = useState(false);
  const matSearchRef = useRef<HTMLInputElement>(null);
  const matDropContainerRef = useRef<HTMLDivElement>(null);

  const newForm = useForm({
    defaultValues: {
      generatedCode: '',
      name: '',
      type: 'CERAMIC' as MaterialType,
      manufacturer: '',
      unit: 'gram' as 'gram' | 'ml' | 'piece' | 'disc',
      biocompatible: true,
      ceMarked: true,
      lotNumber: '',
      quantity: 1,
      supplierName: '',
      expiryDate: '',
    },
  });

  const lotForm = useForm({
    defaultValues: {
      materialId: '',
      materialName: '',
      lotNumber: '',
      quantity: 1,
      supplierName: '',
      expiryDate: '',
    },
  });

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      newForm.reset();
      lotForm.reset();
      setSubmitError(null);
      setTab('new');
      setMatSearch('');
    }
  }, [isOpen]);

  // Auto-generate code when material type changes
  const watchedType = newForm.watch('type');
  useEffect(() => {
    if (!isOpen || tab !== 'new') return;
    fetch(`/api/materials/generate-code?type=${watchedType}`)
      .then(r => r.json())
      .then(d => { if (d.code) newForm.setValue('generatedCode', d.code); })
      .catch(() => {});
  }, [watchedType, isOpen, tab]);

  // Load materials for LOT tab
  useEffect(() => {
    if (tab === 'lot' && allMaterials.length === 0) {
      setLoadingMaterials(true);
      fetch('/api/materials?pageSize=200&active=true')
        .then(r => r.json())
        .then(data => setAllMaterials(data.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingMaterials(false));
    }
  }, [tab]);

  // Focus mat search when dropdown opens + close on outside click
  useEffect(() => {
    if (!matDropOpen) { setMatSearch(''); return; }
    const handleClickOutside = (e: MouseEvent) => {
      if (!matDropContainerRef.current?.contains(e.target as Node)) {
        setMatDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [matDropOpen]);

  const filteredAllMaterials = allMaterials.filter(m =>
    m.name.toLowerCase().includes(matSearch.toLowerCase())
  );

  const handleNewSubmit = newForm.handleSubmit(async data => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const matRes = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.generatedCode,
          name: data.name,
          type: data.type,
          manufacturer: data.manufacturer,
          unit: data.unit,
          biocompatible: data.biocompatible,
          ceMarked: data.ceMarked,
          active: true,
        }),
      });
      if (!matRes.ok) throw new Error((await matRes.json()).error || 'Failed to create material');
      const matResult = await matRes.json();
      const materialId = matResult.id;
      if (!materialId) throw new Error('Material created but ID missing');

      let firstLot: { id: string; lotNumber: string; quantityAvailable: number; expiryDate: string | null; arrivalDate: string; status: string } | undefined;
      if (data.lotNumber.trim()) {
        const lotRes = await fetch(`/api/materials/${materialId}/lots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lotNumber: data.lotNumber.trim(),
            quantityReceived: data.quantity,
            supplierName: data.supplierName || 'Unknown',
            arrivalDate: new Date(),
            ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate) } : {}),
          }),
        });
        if (!lotRes.ok) throw new Error((await lotRes.json()).error || 'Failed to create LOT');
        const lotResult = await lotRes.json();
        if (lotResult.id) {
          firstLot = {
            id: lotResult.id,
            lotNumber: data.lotNumber.trim(),
            quantityAvailable: data.quantity,
            expiryDate: data.expiryDate || null,
            arrivalDate: new Date().toISOString(),
            status: 'AVAILABLE',
          } as any;
        }
      }

      onSuccess({
        materialId,
        code: data.generatedCode,
        name: data.name,
        unit: data.unit,
        availableStock: firstLot ? data.quantity : 0,
        lots: firstLot ? [firstLot as any] : [],
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create material');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleLotSubmit = lotForm.handleSubmit(async data => {
    if (!data.materialId) { setSubmitError('Izberite surovino'); return; }
    if (!data.lotNumber.trim()) { setSubmitError('LOT številka je obvezna'); return; }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const lotRes = await fetch(`/api/materials/${data.materialId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotNumber: data.lotNumber.trim(),
          quantityReceived: data.quantity,
          supplierName: data.supplierName || 'Unknown',
          arrivalDate: new Date(),
          ...(data.expiryDate ? { expiryDate: new Date(data.expiryDate) } : {}),
        }),
      });
      if (!lotRes.ok) throw new Error((await lotRes.json()).error || 'Failed to create LOT');
      const lotResult = await lotRes.json();
      if (!lotResult.id) throw new Error('LOT created but ID missing');

      const mat = allMaterials.find(m => m.id === data.materialId)!;
      onSuccess({
        materialId: data.materialId,
        code: mat.code,
        name: mat.name,
        unit: mat.unit,
        availableStock: data.quantity,
        lots: [{
          id: lotResult.id,
          lotNumber: data.lotNumber.trim(),
          quantityAvailable: data.quantity,
          expiryDate: data.expiryDate || null,
          arrivalDate: new Date().toISOString(),
          status: 'AVAILABLE',
        }],
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create LOT');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Surovina / LOT
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          {(['new', 'lot'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setSubmitError(null); }}
              className={`flex-1 text-sm py-1.5 rounded transition-colors ${tab === t ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t === 'new' ? 'Nova surovina' : 'Dodaj LOT obstoječi'}
            </button>
          ))}
        </div>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* New Material Tab */}
        {tab === 'new' && (
          <form onSubmit={handleNewSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tip <span className="text-red-500">*</span></Label>
                <Select value={newForm.watch('type')} onValueChange={v => newForm.setValue('type', v as MaterialType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES_LIST.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Enota <span className="text-red-500">*</span></Label>
                <Select value={newForm.watch('unit')} onValueChange={v => newForm.setValue('unit', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['gram', 'ml', 'piece', 'disc'] as const).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Naziv <span className="text-red-500">*</span></Label>
              <Input {...newForm.register('name', { required: true })} placeholder="Naziv surovine" />
            </div>

            <div className="space-y-1">
              <Label>Proizvajalec <span className="text-red-500">*</span></Label>
              <Input {...newForm.register('manufacturer', { required: true })} placeholder="Proizvajalec" />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="qc-bio" checked={newForm.watch('biocompatible')} onCheckedChange={v => newForm.setValue('biocompatible', Boolean(v))} />
                <Label htmlFor="qc-bio" className="cursor-pointer">Biokompatibilno</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="qc-ce" checked={newForm.watch('ceMarked')} onCheckedChange={v => newForm.setValue('ceMarked', Boolean(v))} />
                <Label htmlFor="qc-ce" className="cursor-pointer">CE oznaka</Label>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Prva zaloga (neobvezno)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>LOT številka</Label>
                  <Input {...newForm.register('lotNumber')} placeholder="npr. LOT2026-001" />
                </div>
                <div className="space-y-1">
                  <Label>Količina</Label>
                  <Input type="number" min="0.001" step="0.001" {...newForm.register('quantity', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Dobavitelj</Label>
                  <Input {...newForm.register('supplierName')} placeholder="Dobavitelj" />
                </div>
                <div className="space-y-1">
                  <Label>Rok trajanja</Label>
                  <Input type="date" {...newForm.register('expiryDate')} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Prekliči</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ustvari surovino
              </Button>
            </div>
          </form>
        )}

        {/* Add LOT to Existing Tab */}
        {tab === 'lot' && (
          <form onSubmit={handleLotSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Surovina <span className="text-red-500">*</span></Label>
              {loadingMaterials ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Nalaganje...
                </div>
              ) : (
                <div ref={matDropContainerRef}>
                  <button
                    type="button"
                    className="w-full h-9 text-sm border border-input rounded-md px-3 flex items-center justify-between bg-background hover:bg-accent"
                    onClick={() => setMatDropOpen(v => !v)}
                  >
                    <span className={lotForm.watch('materialName') ? 'text-foreground' : 'text-muted-foreground'}>
                      {lotForm.watch('materialName') || 'Izberite surovino...'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {matDropOpen && (
                    <div className="mt-1 border border-input rounded-md bg-white shadow-sm">
                      <div className="p-2 border-b">
                        <Input
                          ref={matSearchRef}
                          autoFocus
                          placeholder="Iskanje..."
                          value={matSearch}
                          onChange={e => setMatSearch(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {filteredAllMaterials.length > 0 ? filteredAllMaterials.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                            onClick={() => {
                              lotForm.setValue('materialId', m.id);
                              lotForm.setValue('materialName', m.name);
                              setMatDropOpen(false);
                            }}
                          >
                            {m.name}
                          </button>
                        )) : (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Ni rezultatov</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>LOT številka <span className="text-red-500">*</span></Label>
                <Input {...lotForm.register('lotNumber')} placeholder="npr. LOT2026-042" />
              </div>
              <div className="space-y-1">
                <Label>Količina <span className="text-red-500">*</span></Label>
                <Input type="number" min="0.001" step="0.001" {...lotForm.register('quantity', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dobavitelj</Label>
                <Input {...lotForm.register('supplierName')} placeholder="Dobavitelj" />
              </div>
              <div className="space-y-1">
                <Label>Rok trajanja</Label>
                <Input type="date" {...lotForm.register('expiryDate')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Prekliči</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dodaj LOT
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
