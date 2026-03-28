'use client';

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
import { Loader2 } from 'lucide-react';

const createMaterialSchema = (t: any) => z.object({
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
});

type MaterialFormData = z.infer<ReturnType<typeof createMaterialSchema>>;

interface MaterialFormProps {
  initialData?: Partial<MaterialFormData>;
  onSubmit: (data: MaterialFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isEditMode = false,
}: MaterialFormProps) {
  const t = useTranslations();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const form = useForm({
    resolver: zodResolver(createMaterialSchema(t)),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      type: initialData?.type || ('CERAMIC' as MaterialType),
      manufacturer: initialData?.manufacturer || '',
      description: initialData?.description || '',
      biocompatible: initialData?.biocompatible ?? true,
      iso10993Cert: initialData?.iso10993Cert || '',
      ceMarked: initialData?.ceMarked ?? true,
      ceNumber: initialData?.ceNumber || '',
      unit: initialData?.unit || ('gram' as const),
      active: initialData?.active ?? true,
    },
  });

  const currentType = form.watch('type');

  // Update form when initialData changes (e.g., from scan)
  useEffect(() => {
    if (initialData) {
      console.log('📝 MaterialForm received initialData:', initialData);
      if (initialData.name) {
        console.log('  → Setting name:', initialData.name);
        form.setValue('name', initialData.name);
      }
      if (initialData.manufacturer) {
        console.log('  → Setting manufacturer:', initialData.manufacturer);
        form.setValue('manufacturer', initialData.manufacturer);
      }
      if (initialData.type) {
        console.log('  → Setting type:', initialData.type);
        form.setValue('type', initialData.type);
      }
      if (initialData.unit) {
        console.log('  → Setting unit:', initialData.unit);
        form.setValue('unit', initialData.unit as any);
      }
    }
  }, [initialData, form]);

  // Auto-generate code when type changes (only for new materials)
  useEffect(() => {
    if (isEditMode) return; // Don't regenerate for existing materials

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
  }, [currentType, isEditMode, form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Row 1: Type + Code + Name + Manufacturer */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="type">{t('material.formTypeLabel')}</Label>
          <Select
            value={form.watch('type')}
            onValueChange={(value) => form.setValue('type', value as MaterialType)}
            disabled={isEditMode}
          >
            <SelectTrigger>
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
          {isEditMode && (
            <p className="text-xs text-muted-foreground mt-1">{t('material.formTypeCannotChange')}</p>
          )}
        </div>
        <div>
          <Label htmlFor="code">{t('material.formCodeLabel')}</Label>
          <div className="relative">
            <Input
              id="code"
              {...form.register('code')}
              readOnly
              className="bg-muted"
            />
            {isGeneratingCode && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {form.formState.errors.code && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.code.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="name">{t('material.formNameLabel')}</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="manufacturer">{t('material.formManufacturerLabel')}</Label>
          <Input id="manufacturer" {...form.register('manufacturer')} />
          {form.formState.errors.manufacturer && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.manufacturer.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">{t('material.formDescriptionLabel')}</Label>
        <Textarea id="description" {...form.register('description')} rows={2} />
      </div>

      {/* Row 2: Biocompatible cert + CE number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="iso10993Cert">{t('material.formISO10993Label')}</Label>
          <Input id="iso10993Cert" {...form.register('iso10993Cert')} />
        </div>
        <div>
          <Label htmlFor="ceNumber">{t('material.formCENumberLabel')}</Label>
          <Input id="ceNumber" {...form.register('ceNumber')} />
        </div>
      </div>

      {/* Row 3: Biocompatible + CE + Unit + Active — all on one line */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox
            id="biocompatible"
            checked={form.watch('biocompatible')}
            onCheckedChange={(checked) => form.setValue('biocompatible', checked as boolean)}
          />
          <Label htmlFor="biocompatible" className="cursor-pointer">{t('material.formBiocompatibleLabel')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="ceMarked"
            checked={form.watch('ceMarked')}
            onCheckedChange={(checked) => form.setValue('ceMarked', checked as boolean)}
          />
          <Label htmlFor="ceMarked" className="cursor-pointer">{t('material.formCEMarkedLabel')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="unit" className="whitespace-nowrap">{t('material.formUnitLabel')}:</Label>
          <Select
            value={form.watch('unit')}
            onValueChange={(value) => form.setValue('unit', value as any)}
          >
            <SelectTrigger className="w-32">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="active"
            checked={form.watch('active')}
            onCheckedChange={(checked) => form.setValue('active', checked as boolean)}
          />
          <Label htmlFor="active" className="cursor-pointer">{t('material.formActiveLabel')}</Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('material.formCancelButton')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading || isGeneratingCode}>
          {isLoading ? t('material.formSavingButton') : t('material.formSaveButton')}
        </Button>
      </div>
    </form>
  );
}
