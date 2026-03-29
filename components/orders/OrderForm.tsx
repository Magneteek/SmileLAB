'use client';

/**
 * OrderForm Component
 *
 * Form for creating and editing orders with validation
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

// Maps UI source to impressionType (same logic as incoming page)
const ORDER_SOURCES = [
  { value: 'PHYSICAL',     label: 'Fizično / Kurir',    impressionType: 'PHYSICAL_IMPRINT' as const },
  { value: 'EMAIL',        label: 'E-pošta / FilePort', impressionType: 'PHYSICAL_IMPRINT' as const },
  { value: 'MEDIT',        label: 'MeditLink',          impressionType: 'DIGITAL_SCAN' as const },
  { value: 'SHINING3D',    label: 'Shining 3D',         impressionType: 'DIGITAL_SCAN' as const },
  { value: 'GOOGLE_DRIVE', label: 'Google Drive',       impressionType: 'DIGITAL_SCAN' as const },
  { value: 'THREESHAPE',   label: '3Shape',              impressionType: 'DIGITAL_SCAN' as const },
] as const;

interface OrderFormProps {
  orderId?: string;
  initialData?: Partial<any>;
  onSuccess?: (orderId: string, worksheetId?: string) => void;
  onCancel?: () => void;
}

interface Dentist {
  id: string;
  clinicName: string;
  dentistName: string;
}

export function OrderForm({
  orderId,
  initialData,
  onSuccess,
  onCancel,
}: OrderFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDentists, setIsLoadingDentists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form validation schema - must be inside component to access translations
  const orderFormSchema = z.object({
    dentistId: z.string().min(1, t('order.formValidationSelectDentist')),
    patientName: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.number().int().min(0).max(2),
    source: z.enum(['PHYSICAL', 'EMAIL', 'MEDIT', 'SHINING3D', 'GOOGLE_DRIVE', 'THREESHAPE']),
    status: z.nativeEnum(OrderStatus).optional(), // Only for editing
    notes: z.string().optional(),
  });

  type OrderFormValues = z.infer<typeof orderFormSchema>;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      dentistId: initialData?.dentistId || '',
      patientName: initialData?.patientName ?? '',
      dueDate: initialData?.dueDate || '',
      priority: initialData?.priority ?? 0,
      source: 'PHYSICAL',
      status: (initialData as any)?.status,
      notes: initialData?.notes ?? '',
    },
  });

  // Fetch dentists on mount
  useEffect(() => {
    async function fetchDentists() {
      try {
        const response = await fetch('/api/dentists?simple=true');
        if (!response.ok) {
          throw new Error('Failed to fetch dentists');
        }
        const result = await response.json();
        if (result.success) {
          setDentists(result.data);
        }
      } catch (err) {
        console.error('Error fetching dentists:', err);
        setError(t('order.formErrorLoadDentists'));
      } finally {
        setIsLoadingDentists(false);
      }
    }

    fetchDentists();
  }, []);

  async function onSubmit(data: OrderFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Format the data for API
      const sourceConfig = ORDER_SOURCES.find((s) => s.value === data.source)!;
      const payload = {
        dentistId: data.dentistId,
        patientName: data.patientName || null,
        dueDate: data.dueDate
          ? new Date(data.dueDate).toISOString()
          : null,
        priority: data.priority,
        impressionType: sourceConfig.impressionType,
        status: data.status, // Only included when editing
        notes: data.notes || null,
      };

      const url = orderId ? `/api/orders/${orderId}` : '/api/orders';
      const method = orderId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('order.formErrorSaveOrder'));
      }

      if (result.success) {
        const orderId = result.data.order?.id ?? result.data.id;
        const worksheetId = result.data.worksheet?.id;
        if (onSuccess) {
          onSuccess(orderId, worksheetId);
        } else {
          // Redirect to worksheet if created, otherwise to order
          router.push(worksheetId ? `/worksheets/${worksheetId}` : `/orders/${orderId}`);
        }
      }
    } catch (err) {
      console.error('Error saving order:', err);
      setError(
        err instanceof Error ? err.message : t('order.formErrorSaveOrder')
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingDentists) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">{t('order.formLoadingText')}</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Row 1: Dentist + Patient */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dentistId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order.formDentistLabel')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('order.formDentistPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {dentists.map((dentist) => (
                      <SelectItem key={dentist.id} value={dentist.id}>
                        {dentist.clinicName} - {dentist.dentistName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order.formPatientLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('order.formPatientPlaceholder')}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Source + Due date + Priority */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vir naročila</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ORDER_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order.formDueDateLabel')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order.formPriorityLabel')}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">{t('order.priorityNormal')}</SelectItem>
                    <SelectItem value="1">{t('order.priorityHigh')}</SelectItem>
                    <SelectItem value="2">{t('order.priorityUrgent')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status field - only show when editing */}
        {orderId && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order.formStatusLabel')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('order.formStatusPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                    <SelectItem value="IN_PRODUCTION">{t('status.in_production')}</SelectItem>
                    <SelectItem value="QC_PENDING">{t('status.qc_pending')}</SelectItem>
                    <SelectItem value="QC_APPROVED">{t('status.qc_approved')}</SelectItem>
                    <SelectItem value="INVOICED">{t('status.invoiced')}</SelectItem>
                    <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                    <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order.formNotesLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('order.formNotesPlaceholder')}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('order.formNotesDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {orderId ? t('order.formUpdateButton') : t('order.formCreateButton')}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
