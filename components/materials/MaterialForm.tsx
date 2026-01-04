'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { MaterialType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MATERIAL_UNITS } from '@/types/material';

const createMaterialSchema = (t: any) => z.object({
  code: z.string().min(1, t('material.validationCodeRequired')).max(50),
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
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: MaterialFormProps) {
  const t = useTranslations();
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">{t('material.formCodeLabel')}</Label>
          <Input id="code" {...form.register('code')} />
          {form.formState.errors.code && (
            <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="name">{t('material.formNameLabel')}</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      {/* Type and Manufacturer */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">{t('material.formTypeLabel')}</Label>
          <Select
            value={form.watch('type')}
            onValueChange={(value) => form.setValue('type', value as MaterialType)}
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
        </div>
        <div>
          <Label htmlFor="manufacturer">{t('material.formManufacturerLabel')}</Label>
          <Input id="manufacturer" {...form.register('manufacturer')} />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">{t('material.formDescriptionLabel')}</Label>
        <Textarea id="description" {...form.register('description')} rows={3} />
      </div>

      {/* Biocompatibility */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="biocompatible"
            checked={form.watch('biocompatible')}
            onCheckedChange={(checked) => form.setValue('biocompatible', checked as boolean)}
          />
          <Label htmlFor="biocompatible">{t('material.formBiocompatibleLabel')}</Label>
        </div>
        <div>
          <Label htmlFor="iso10993Cert">{t('material.formISO10993Label')}</Label>
          <Input id="iso10993Cert" {...form.register('iso10993Cert')} />
        </div>
      </div>

      {/* CE Marking */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ceMarked"
            checked={form.watch('ceMarked')}
            onCheckedChange={(checked) => form.setValue('ceMarked', checked as boolean)}
          />
          <Label htmlFor="ceMarked">{t('material.formCEMarkedLabel')}</Label>
        </div>
        <div>
          <Label htmlFor="ceNumber">{t('material.formCENumberLabel')}</Label>
          <Input id="ceNumber" {...form.register('ceNumber')} />
        </div>
      </div>

      {/* Unit and Active Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit">{t('material.formUnitLabel')}</Label>
          <Select
            value={form.watch('unit')}
            onValueChange={(value) => form.setValue('unit', value as any)}
          >
            <SelectTrigger>
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
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="active"
            checked={form.watch('active')}
            onCheckedChange={(checked) => form.setValue('active', checked as boolean)}
          />
          <Label htmlFor="active">{t('material.formActiveLabel')}</Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('material.formCancelButton')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('material.formSavingButton') : t('material.formSaveButton')}
        </Button>
      </div>
    </form>
  );
}
