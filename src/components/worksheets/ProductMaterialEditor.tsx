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

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { X, Plus, Copy, ChevronDown, AlertTriangle, Package } from 'lucide-react';

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
  readOnly = false,
}: ProductMaterialEditorProps) {
  const t = useTranslations();
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
        <Select
          onValueChange={(materialId) => {
            if (materialId && materialId !== '_placeholder') {
              addMaterial(materialId);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
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
                      {/* Tooth Association - First (Small) */}
                      <div>
                        <Label className="text-[10px] text-gray-600 mb-0.5 block">
                          {t('productMaterialEditor.toothFieldLabel')}
                        </Label>
                        <Select
                          value={instance.toothNumber || ''}
                          onValueChange={(value) => updateInstance(index, { toothNumber: value || undefined })}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t('productMaterialEditor.selectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none" className="text-sm text-gray-500">
                              {t('productMaterialEditor.noToothOption')}
                            </SelectItem>
                            {availableTeeth.map((tooth) => (
                              <SelectItem key={tooth} value={tooth} className="text-sm">
                                {t('productMaterialEditor.toothOption', { number: tooth })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
    </div>
  );
}
