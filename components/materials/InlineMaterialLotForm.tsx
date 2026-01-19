'use client';

/**
 * Inline Material + LOT Creation Form
 *
 * Used within SmartMaterialScanner to create both Material and LOT in one transaction
 * Pre-fills data from OCR scan and allows user to edit all fields before saving
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MaterialType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MATERIAL_UNITS } from '@/types/material';
import { Loader2, Package, Hash, Calendar, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const createInlineMaterialLotSchema = (t: any) => z.object({
  // Material fields
  code: z.string().min(1, t('material.validationCodeRequired')).max(5, t('material.validationCodeMaxLength')),
  name: z.string().min(1, t('material.validationNameRequired')).max(200),
  type: z.nativeEnum(MaterialType),
  manufacturer: z.string().min(1, t('material.validationManufacturerRequired')).max(200),
  description: z.string().optional(),
  biocompatible: z.boolean().optional().default(true),
  iso10993Cert: z.string().optional(),
  ceMarked: z.boolean().optional().default(true),
  ceNumber: z.string().optional(),
  unit: z.enum(['gram', 'ml', 'piece', 'disc']).optional().default('gram'),
  active: z.boolean().optional().default(true),

  // LOT fields
  lotNumber: z.string().min(1, t('material.validationLotNumberRequired')),
  expiryDate: z.date().optional(),
  quantityReceived: z.number().positive(t('material.validationQuantityPositive')).optional(),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
});

type InlineMaterialLotFormData = z.infer<ReturnType<typeof createInlineMaterialLotSchema>>;

interface InlineMaterialLotFormProps {
  // Pre-filled data from OCR
  initialMaterialData?: {
    name?: string;
    manufacturer?: string;
    type?: MaterialType;
    unit?: string;
  };
  initialLotData?: {
    lotNumber?: string;
    expiryDate?: Date;
    quantity?: number;
  };
  onSubmit: (data: InlineMaterialLotFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function InlineMaterialLotForm({
  initialMaterialData,
  initialLotData,
  onSubmit,
  onCancel,
  isLoading,
}: InlineMaterialLotFormProps) {
  const t = useTranslations();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const form = useForm({
    resolver: zodResolver(createInlineMaterialLotSchema(t)),
    defaultValues: {
      // Material defaults
      code: '',
      name: initialMaterialData?.name || '',
      type: (initialMaterialData?.type || 'CERAMIC') as MaterialType,
      manufacturer: initialMaterialData?.manufacturer || '',
      description: '',
      biocompatible: true,
      iso10993Cert: '',
      ceMarked: true,
      ceNumber: '',
      unit: (initialMaterialData?.unit || 'gram') as any,
      active: true,

      // LOT defaults
      lotNumber: initialLotData?.lotNumber || '',
      expiryDate: initialLotData?.expiryDate || undefined,
      quantityReceived: initialLotData?.quantity || undefined,
      supplierName: '',
      notes: '',
    },
  });

  const currentType = form.watch('type');

  // Auto-generate code when type changes
  useEffect(() => {
    const generateCode = async () => {
      setIsGeneratingCode(true);
      try {
        const response = await fetch(`/api/materials/generate-code?type=${currentType}`);
        if (response.ok) {
          const data = await response.json();
          form.setValue('code', data.code);
        }
      } catch (error) {
        console.error('Failed to generate code:', error);
      } finally {
        setIsGeneratingCode(false);
      }
    };

    generateCode();
  }, [currentType, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Material Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('scanner.materialInformationTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('scanner.materialInformationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type and Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type" className="text-xs">{t('material.formTypeLabel')}</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as MaterialType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('material.formTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(['CERAMIC', 'METAL', 'RESIN', 'COMPOSITE', 'PORCELAIN', 'ZIRCONIA', 'TITANIUM', 'ALLOY', 'ACRYLIC', 'WAX', 'OTHER'] as MaterialType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`material.type${type}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="code" className="text-xs">{t('material.formCodeLabel')}</Label>
              <div className="relative">
                <Input
                  id="code"
                  {...form.register('code')}
                  readOnly
                  className="bg-muted h-9 text-sm"
                />
                {isGeneratingCode && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {form.formState.errors.code && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          {/* Name and Manufacturer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs">{t('material.formNameLabel')}</Label>
              <Input id="name" {...form.register('name')} className="h-9 text-sm" />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="manufacturer" className="text-xs">{t('material.formManufacturerLabel')}</Label>
              <Input id="manufacturer" {...form.register('manufacturer')} className="h-9 text-sm" />
              {form.formState.errors.manufacturer && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.manufacturer.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-xs">{t('material.formDescriptionLabel')}</Label>
            <Textarea id="description" {...form.register('description')} rows={2} className="text-sm" />
          </div>

          {/* Biocompatibility */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="biocompatible"
                checked={form.watch('biocompatible')}
                onCheckedChange={(checked) => form.setValue('biocompatible', checked as boolean)}
              />
              <Label htmlFor="biocompatible" className="text-xs font-normal">{t('material.formBiocompatibleLabel')}</Label>
            </div>
            <div>
              <Label htmlFor="iso10993Cert" className="text-xs">{t('material.formISO10993Label')}</Label>
              <Input id="iso10993Cert" {...form.register('iso10993Cert')} className="h-9 text-sm" placeholder={t('scanner.iso10993Placeholder')} />
            </div>
          </div>

          {/* CE Marking */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ceMarked"
                checked={form.watch('ceMarked')}
                onCheckedChange={(checked) => form.setValue('ceMarked', checked as boolean)}
              />
              <Label htmlFor="ceMarked" className="text-xs font-normal">{t('material.formCEMarkedLabel')}</Label>
            </div>
            <div>
              <Label htmlFor="ceNumber" className="text-xs">{t('material.formCENumberLabel')}</Label>
              <Input id="ceNumber" {...form.register('ceNumber')} className="h-9 text-sm" placeholder={t('scanner.ceNumberPlaceholder')} />
            </div>
          </div>

          {/* Unit and Active Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit" className="text-xs">{t('material.formUnitLabel')}</Label>
              <Select
                value={form.watch('unit')}
                onValueChange={(value) => form.setValue('unit', value as any)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`material.unit${unit.charAt(0).toUpperCase() + unit.slice(1)}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="active"
                checked={form.watch('active')}
                onCheckedChange={(checked) => form.setValue('active', checked as boolean)}
              />
              <Label htmlFor="active" className="text-xs font-normal">{t('material.formActiveLabel')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOT Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t('scanner.lotInformationTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('scanner.lotInformationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LOT Number */}
          <div>
            <Label htmlFor="lotNumber" className="text-xs">{t('material.formLotNumberLabel')}</Label>
            <Input
              id="lotNumber"
              {...form.register('lotNumber')}
              className="h-9 text-sm font-mono"
              placeholder={t('scanner.lotNumberPlaceholder')}
            />
            {form.formState.errors.lotNumber && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.lotNumber.message}</p>
            )}
          </div>

          {/* Expiry Date and Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiryDate" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('material.formExpiryDateLabel')}
              </Label>
              <Input
                id="expiryDate"
                type="date"
                {...form.register('expiryDate', {
                  setValueAs: (value) => (value ? new Date(value) : undefined),
                })}
                defaultValue={initialLotData?.expiryDate ? initialLotData.expiryDate.toISOString().split('T')[0] : ''}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="quantityReceived" className="text-xs flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {t('material.formQuantityLabel')}
              </Label>
              <Input
                id="quantityReceived"
                type="number"
                step="0.01"
                {...form.register('quantityReceived', {
                  setValueAs: (value) => (value ? parseFloat(value) : undefined),
                })}
                className="h-9 text-sm"
                placeholder={`e.g., 100 ${form.watch('unit')}`}
              />
              {form.formState.errors.quantityReceived && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.quantityReceived.message}</p>
              )}
            </div>
          </div>

          {/* Supplier and Notes */}
          <div>
            <Label htmlFor="supplierName" className="text-xs">{t('material.formSupplierLabel')}</Label>
            <Input
              id="supplierName"
              {...form.register('supplierName')}
              className="h-9 text-sm"
              placeholder={t('scanner.supplierPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs">{t('material.formNotesLabel')}</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="text-sm"
              placeholder={t('scanner.notesPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading || isGeneratingCode}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('scanner.savingMaterialLot')}
            </>
          ) : (
            t('scanner.saveMaterialLot')
          )}
        </Button>
      </div>
    </form>
  );
}
