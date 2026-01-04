'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const createStockArrivalSchema = (t: any) => z.object({
  lotNumber: z.string().min(1, t('material.arrivalValidationLOTRequired')).max(100),
  expiryDate: z.date().optional().refine(
    (date) => !date || date > new Date(),
    { message: t('material.arrivalValidationExpiryDateRequired') }
  ),
  supplierName: z.string().optional(),
  quantityReceived: z.number().positive(t('material.arrivalValidationQuantityMin')),
  supplierBatchNumber: z.string().optional(),
  notes: z.string().optional(),
  arrivalDate: z.date().optional(),
});

type StockArrivalFormData = z.infer<ReturnType<typeof createStockArrivalSchema>>;

interface StockArrivalFormProps {
  materialId: string;
  materialName: string;
  onSubmit: (data: StockArrivalFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StockArrivalForm({
  materialId,
  materialName,
  onSubmit,
  onCancel,
  isLoading,
}: StockArrivalFormProps) {
  const t = useTranslations();
  const form = useForm<StockArrivalFormData>({
    resolver: zodResolver(createStockArrivalSchema(t)),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t('material.arrivalFormTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('material.arrivalFormMaterialLabel')}: {materialName}</p>
      </div>

      <div>
        <Label htmlFor="lotNumber">{t('material.arrivalFormLOTLabel')}</Label>
        <Input
          id="lotNumber"
          {...form.register('lotNumber')}
          placeholder={t('material.arrivalFormLOTPlaceholder')}
        />
        {form.formState.errors.lotNumber && (
          <p className="text-sm text-red-600">{form.formState.errors.lotNumber.message}</p>
        )}
      </div>

      <div>
        <Label>{t('material.arrivalFormExpiryDateLabel')}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'inline-flex items-center justify-start gap-2 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                !form.watch('expiryDate') && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {form.watch('expiryDate')
                ? format(form.watch('expiryDate')!, 'PPP')
                : t('material.arrivalFormExpiryDatePlaceholder')}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={form.watch('expiryDate')}
              onSelect={(date) => form.setValue('expiryDate', date as Date | undefined)}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.expiryDate && (
          <p className="text-sm text-red-600">{form.formState.errors.expiryDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="supplierName">{t('material.arrivalFormSupplierLabel')}</Label>
        <Input id="supplierName" {...form.register('supplierName')} />
        {form.formState.errors.supplierName && (
          <p className="text-sm text-red-600">{form.formState.errors.supplierName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="quantityReceived">{t('material.arrivalFormQuantityLabel')}</Label>
        <Input
          id="quantityReceived"
          type="number"
          step="0.001"
          {...form.register('quantityReceived', { valueAsNumber: true })}
        />
        {form.formState.errors.quantityReceived && (
          <p className="text-sm text-red-600">{form.formState.errors.quantityReceived.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">{t('material.arrivalFormNotesLabel')}</Label>
        <Textarea id="notes" {...form.register('notes')} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('material.arrivalFormCancelButton')}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('material.arrivalFormSavingButton') : t('material.arrivalFormSaveButton')}
        </Button>
      </div>
    </form>
  );
}
