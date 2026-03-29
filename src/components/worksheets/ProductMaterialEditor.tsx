/**
 * Product Material Editor Component
 *
 * Manages material assignments for a single product with support for:
 * - Multiple instances of same material (different LOTs)
 * - LOT selection with stock indicators
 * - Tooth association (FDI notation)
 * - Notes/clarification per instance
 * - Progressive disclosure UI (expandable sections)
 * - Duplicate detection with confirmation
 */

'use client';

import { useState, useEffect } from 'react';
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
import { X, Plus, Copy, AlertTriangle, Package, Loader2, AlertCircle } from 'lucide-react';
import type { MaterialType } from '@prisma/client';

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

interface ProductMaterialEditorProps {
  productId: string;
  productName: string;
  materials: ProductMaterialInstance[];
  availableMaterials: AvailableMaterial[];
  availableTeeth: string[];  // From worksheet teeth selection
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

  /**
   * Add material instance
   */
  const addMaterial = (materialId: string, checkDuplicate: boolean = true) => {
    const materialInfo = availableMaterials.find(m => m.materialId === materialId);
    if (!materialInfo) return;

    // Check for duplicates (same material + same LOT or both null)
    if (checkDuplicate) {
      const hasDuplicate = materials.some(m =>
        m.materialId === materialId && !m.materialLotId
      );

      if (hasDuplicate) {
        setDuplicateAlert({
          show: true,
          materialId,
          materialName: `${materialInfo.code} - ${materialInfo.name}`,
          lotId: undefined,
        });
        return;
      }
    }

    // Get oldest LOT for default FIFO selection
    const oldestLot = materialInfo.lots && materialInfo.lots.length > 0
      ? materialInfo.lots[0]  // Already sorted by arrivalDate in query
      : null;

    // Create new instance
    const newInstance: ProductMaterialInstance = {
      materialId,
      materialLotId: oldestLot?.id,  // Default to FIFO
      quantityUsed: 1,
      toothNumber: undefined,
      notes: undefined,
      position: materials.length + 1,
    };

    onChange([...materials, newInstance]);
  };

  /**
   * Confirm duplicate addition
   */
  const confirmDuplicateAdd = () => {
    if (duplicateAlert) {
      addMaterial(duplicateAlert.materialId, false);  // Bypass check
      setDuplicateAlert(null);
    }
  };

  /**
   * Duplicate existing instance
   */
  const duplicateInstance = (index: number) => {
    const instance = materials[index];
    const newInstance: ProductMaterialInstance = {
      ...instance,
      materialLotId: undefined,  // Clear LOT (force user to select)
      position: materials.length + 1,
      notes: instance.notes ? `${instance.notes} (copy)` : undefined,
    };

    onChange([...materials, newInstance]);
  };

  /**
   * Remove material instance
   */
  const removeInstance = (index: number) => {
    onChange(materials.filter((_, i) => i !== index));
  };

  /**
   * Update material instance
   */
  const updateInstance = (index: number, updates: Partial<ProductMaterialInstance>) => {
    onChange(
      materials.map((mat, i) => (i === index ? { ...mat, ...updates } : mat))
    );
  };

  /**
   * Get material info
   */
  const getMaterialInfo = (materialId: string) => {
    return availableMaterials.find(m => m.materialId === materialId);
  };

  /**
   * Get LOT info
   */
  const getLotInfo = (materialId: string, lotId: string | undefined) => {
    if (!lotId) return null;
    const material = getMaterialInfo(materialId);
    return material?.lots.find(l => l.id === lotId);
  };

  /**
   * Check if LOT is missing (required fields)
   */
  const isMissingLot = (instance: ProductMaterialInstance) => {
    return !instance.materialLotId;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-gray-700">
          {t('productMaterialEditor.materialsUsedTitle', { count: materials.length })}
        </Label>
        {materials.filter(isMissingLot).length > 0 && (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {materials.filter(isMissingLot).length} {t('productMaterialEditor.withoutLot')}
          </Badge>
        )}
      </div>

      {/* Add Material Dropdown - Moved to top */}
      {!readOnly && (
        <div className="flex gap-1">
          <Select
            onValueChange={(materialId) => {
              if (materialId && materialId !== '_placeholder') {
                addMaterial(materialId);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder={t('productMaterialEditor.addMaterialPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {availableMaterials.map((mat) => (
                <SelectItem key={mat.materialId} value={mat.materialId} className="text-xs">
                  {mat.code} - {mat.name}
                  {mat.availableStock !== undefined && (
                    <span className="text-[10px] text-gray-500 ml-2">
                      ({t('productMaterialEditor.availableStock', { count: mat.availableStock, unit: mat.unit })})
                    </span>
                  )}
                </SelectItem>
              ))}
              {availableMaterials.length === 0 && (
                <SelectItem value="_placeholder" disabled className="text-xs text-gray-500">
                  {t('productMaterialEditor.noMaterialsAvailable')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 shrink-0"
            onClick={() => setShowCreateDialog(true)}
            title="Create new material"
          >
            <Package className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Material Instances */}
      <div className="space-y-1.5">
        {materials.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-2">
            {t('productMaterialEditor.noMaterialsAssigned')}
          </p>
        ) : (
          materials.map((instance, index) => {
            const materialInfo = getMaterialInfo(instance.materialId);
            const lotInfo = getLotInfo(instance.materialId, instance.materialLotId);

            return (
              <Collapsible key={index} defaultOpen={isMissingLot(instance)}>
                <div className="border rounded-md bg-white overflow-hidden">
                  {/* Collapsible Trigger - Entire Header is Clickable */}
                  <CollapsibleTrigger asChild>
                    <div className="p-2 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0">
                            <Package className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium text-xs">
                              {materialInfo?.code} - {materialInfo?.name}
                            </span>
                            {instance.position && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                #{instance.position}
                              </Badge>
                            )}
                            {isMissingLot(instance) && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                {t('productMaterialEditor.noLotBadge')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            {t('productMaterialEditor.quantityLabel')} {instance.quantityUsed} {materialInfo?.unit}
                            {lotInfo && (
                              <span className="ml-2">
                                • {t('productMaterialEditor.lotLabel')} {lotInfo.lotNumber}
                              </span>
                            )}
                            {instance.toothNumber && (
                              <span className="ml-2">
                                • {t('productMaterialEditor.toothLabel')} {instance.toothNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {!readOnly && (
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateInstance(index)}
                              className="h-6 w-6 p-0"
                              title={t('productMaterialEditor.duplicateTitle')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstance(index)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title={t('productMaterialEditor.removeTitle')}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Expandable Details - 2-Row Layout */}
                  <CollapsibleContent className="mt-2 pt-2 border-t space-y-2">
                    {/* Row 1: Tooth, Quantity, LOT - Optimized widths */}
                    <div className="grid grid-cols-[1fr_1fr_2fr] gap-2">
                      {/* Tooth Association - Multi-select */}
                      <div>
                        <Label className="text-[10px] text-gray-600 mb-0.5 block">
                          {t('productMaterialEditor.toothFieldLabel')}
                        </Label>
                        {readOnly ? (
                          <div className="h-8 text-xs flex items-center px-2 border rounded-md bg-gray-50 text-gray-700">
                            {instance.toothNumber || '—'}
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="h-8 w-full text-xs flex items-center justify-between px-2 border rounded-md bg-white hover:bg-gray-50 text-left truncate"
                              >
                                <span className="truncate text-gray-700">
                                  {instance.toothNumber
                                    ? instance.toothNumber.split(',').join(', ')
                                    : <span className="text-gray-400">{t('productMaterialEditor.selectPlaceholder')}</span>
                                  }
                                </span>
                                <span className="ml-1 text-gray-400 shrink-0">▾</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-2" align="start">
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {availableTeeth.map((tooth) => {
                                  const selected = (instance.toothNumber || '').split(',').filter(Boolean).includes(tooth);
                                  return (
                                    <label key={tooth} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                                      <Checkbox
                                        checked={selected}
                                        onCheckedChange={(checked) => {
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

                      {/* Quantity - Second (Small) */}
                      <div>
                        <Label className="text-[10px] text-gray-600 mb-0.5 block">
                          {t('productMaterialEditor.quantityFieldLabel', { unit: materialInfo?.unit || '' })}
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={instance.quantityUsed}
                          onChange={(e) => updateInstance(index, { quantityUsed: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* LOT Selection - Third (Larger) */}
                      <div>
                        <Label className="text-[10px] text-gray-600 mb-0.5 block">
                          {t('productMaterialEditor.lotFieldLabel')}
                        </Label>
                        <Select
                          value={instance.materialLotId || ''}
                          onValueChange={(value) => updateInstance(index, { materialLotId: value || undefined })}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t('productMaterialEditor.selectLotPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {materialInfo?.lots && materialInfo.lots.length > 0 ? (
                              materialInfo.lots.map((lot) => (
                                <SelectItem key={lot.id} value={lot.id} className="text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{lot.lotNumber}</span>
                                    <span className="text-xs text-gray-500">
                                      {lot.quantityAvailable} {materialInfo.unit}
                                      {lot.expiryDate && ` • ${t('productMaterialEditor.expLabel')} ${new Date(lot.expiryDate).toLocaleDateString()}`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="_no_lots" disabled className="text-sm text-gray-500">
                                {t('productMaterialEditor.noLotsAvailable')}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 2: Notes - Full width */}
                    <div>
                      <Label className="text-[10px] text-gray-600 mb-0.5 block">
                        {t('productMaterialEditor.notesFieldLabel')}
                      </Label>
                      <Textarea
                        value={instance.notes || ''}
                        onChange={(e) => updateInstance(index, { notes: e.target.value || undefined })}
                        disabled={readOnly}
                        placeholder={t('productMaterialEditor.notesPlaceholder')}
                        className="h-14 text-xs resize-none"
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={duplicateAlert?.show || false} onOpenChange={(open) => !open && setDuplicateAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('productMaterialEditor.duplicateDialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('productMaterialEditor.duplicateDialogDescription', { materialName: duplicateAlert?.materialName || '' }).split('<br />').map((line, i) => (
                <span key={i} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
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
        onSuccess={(newMat) => {
          setShowCreateDialog(false);
          // Notify parent to refresh available materials list
          if (onMaterialCreated) onMaterialCreated(newMat);
          // Auto-add the new material to this product
          const newInstance: ProductMaterialInstance = {
            materialId: newMat.materialId,
            materialLotId: newMat.lots[0]?.id,
            quantityUsed: 1,
            toothNumber: undefined,
            notes: undefined,
            position: materials.length + 1,
          };
          onChange([...materials, newInstance]);
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
  onSuccess: (material: AvailableMaterial) => void;
}

function QuickCreateMaterialDialog({ isOpen, onClose, onSuccess }: QuickCreateMaterialDialogProps) {
  const [tab, setTab] = useState<'new' | 'lot'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Tab: New Material ──
  const newForm = useForm({
    defaultValues: {
      code: '',
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

  // ── Tab: Add LOT to existing ──
  const [allMaterials, setAllMaterials] = useState<Array<{ id: string; code: string; name: string; unit: string }>>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const lotForm = useForm({
    defaultValues: {
      materialId: '',
      lotNumber: '',
      quantity: 1,
      supplierName: '',
      expiryDate: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      newForm.reset();
      lotForm.reset();
      setSubmitError(null);
      setTab('new');
    }
  }, [isOpen]);

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

  const handleNewSubmit = newForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const matRes = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.code,
          name: data.name,
          type: data.type,
          manufacturer: data.manufacturer,
          unit: data.unit,
          biocompatible: data.biocompatible,
          ceMarked: data.ceMarked,
          active: true,
        }),
      });
      if (!matRes.ok) {
        const err = await matRes.json();
        throw new Error(err.error || 'Failed to create material');
      }
      const matResult = await matRes.json();
      const materialId = matResult.id;
      if (!materialId) throw new Error('Material created but ID missing');

      let firstLot: AvailableMaterial['lots'][0] | undefined;
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
        if (!lotRes.ok) {
          const lotErr = await lotRes.json();
          throw new Error(lotErr.error || 'Failed to create LOT');
        }
        const lotResult = await lotRes.json();
        if (lotResult.id) {
          firstLot = {
            id: lotResult.id,
            lotNumber: data.lotNumber.trim(),
            quantityAvailable: data.quantity,
            expiryDate: data.expiryDate || null,
            arrivalDate: new Date().toISOString(),
            status: 'AVAILABLE',
          };
        }
      }

      onSuccess({
        materialId,
        code: data.code,
        name: data.name,
        unit: data.unit,
        availableStock: firstLot ? data.quantity : 0,
        lots: firstLot ? [firstLot] : [],
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create material');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleLotSubmit = lotForm.handleSubmit(async (data) => {
    if (!data.materialId) { setSubmitError('Select a material'); return; }
    if (!data.lotNumber.trim()) { setSubmitError('LOT number is required'); return; }
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
      if (!lotRes.ok) {
        const err = await lotRes.json();
        throw new Error(err.error || 'Failed to create LOT');
      }
      const lotResult = await lotRes.json();
      if (!lotResult.id) throw new Error('LOT created but ID missing');

      const mat = allMaterials.find(m => m.id === data.materialId)!;
      const newLot: AvailableMaterial['lots'][0] = {
        id: lotResult.id,
        lotNumber: data.lotNumber.trim(),
        quantityAvailable: data.quantity,
        expiryDate: data.expiryDate || null,
        arrivalDate: new Date().toISOString(),
        status: 'AVAILABLE',
      };
      onSuccess({
        materialId: data.materialId,
        code: mat.code,
        name: mat.name,
        unit: mat.unit,
        availableStock: data.quantity,
        lots: [newLot],
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

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          <button
            type="button"
            onClick={() => { setTab('new'); setSubmitError(null); }}
            className={`flex-1 text-sm py-1.5 rounded transition-colors ${tab === 'new' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Nova surovina
          </button>
          <button
            type="button"
            onClick={() => { setTab('lot'); setSubmitError(null); }}
            className={`flex-1 text-sm py-1.5 rounded transition-colors ${tab === 'lot' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Dodaj LOT obstoječi
          </button>
        </div>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* ── Tab: New Material ── */}
        {tab === 'new' && (
          <form onSubmit={handleNewSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qc-code">Code <span className="text-red-500">*</span></Label>
                <Input id="qc-code" {...newForm.register('code', { required: true })} placeholder="e.g. CER01" maxLength={5} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qc-unit">Unit <span className="text-red-500">*</span></Label>
                <Select value={newForm.watch('unit')} onValueChange={(v) => newForm.setValue('unit', v as any)}>
                  <SelectTrigger id="qc-unit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['gram', 'ml', 'piece', 'disc'] as const).map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qc-name">Name <span className="text-red-500">*</span></Label>
              <Input id="qc-name" {...newForm.register('name', { required: true })} placeholder="Material name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qc-type">Type <span className="text-red-500">*</span></Label>
                <Select value={newForm.watch('type')} onValueChange={(v) => newForm.setValue('type', v as MaterialType)}>
                  <SelectTrigger id="qc-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES_LIST.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qc-mfr">Manufacturer <span className="text-red-500">*</span></Label>
                <Input id="qc-mfr" {...newForm.register('manufacturer', { required: true })} placeholder="Manufacturer" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="qc-bio" checked={newForm.watch('biocompatible')} onCheckedChange={(v) => newForm.setValue('biocompatible', Boolean(v))} />
                <Label htmlFor="qc-bio" className="cursor-pointer">Biocompatible</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="qc-ce" checked={newForm.watch('ceMarked')} onCheckedChange={(v) => newForm.setValue('ceMarked', Boolean(v))} />
                <Label htmlFor="qc-ce" className="cursor-pointer">CE Marked</Label>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">First Stock Lot (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qc-lot">LOT Number</Label>
                  <Input id="qc-lot" {...newForm.register('lotNumber')} placeholder="e.g. LOT2026-001" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qc-qty">Quantity</Label>
                  <Input id="qc-qty" type="number" min="0.001" step="0.001" {...newForm.register('quantity', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qc-supplier">Supplier</Label>
                  <Input id="qc-supplier" {...newForm.register('supplierName')} placeholder="Supplier name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qc-expiry">Expiry Date</Label>
                  <Input id="qc-expiry" type="date" {...newForm.register('expiryDate')} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Material
              </Button>
            </div>
          </form>
        )}

        {/* ── Tab: Add LOT to existing ── */}
        {tab === 'lot' && (
          <form onSubmit={handleLotSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Surovina <span className="text-red-500">*</span></Label>
              {loadingMaterials ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Nalaganje...
                </div>
              ) : (
                <Select value={lotForm.watch('materialId')} onValueChange={(v) => lotForm.setValue('materialId', v)}>
                  <SelectTrigger><SelectValue placeholder="Izberite surovino..." /></SelectTrigger>
                  <SelectContent>
                    {allMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lot-number">LOT Number <span className="text-red-500">*</span></Label>
                <Input id="lot-number" {...lotForm.register('lotNumber')} placeholder="e.g. LOT2026-042" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lot-qty">Quantity <span className="text-red-500">*</span></Label>
                <Input id="lot-qty" type="number" min="0.001" step="0.001" {...lotForm.register('quantity', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lot-supplier">Supplier</Label>
                <Input id="lot-supplier" {...lotForm.register('supplierName')} placeholder="Supplier name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lot-expiry">Expiry Date</Label>
                <Input id="lot-expiry" type="date" {...lotForm.register('expiryDate')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
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
