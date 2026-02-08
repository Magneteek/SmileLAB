'use client';

/**
 * DentistForm Component
 *
 * Form for creating and editing dentists/clinics.
 * Features: React Hook Form, Zod validation, professional 2-column layout.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import type { Dentist } from '@prisma/client';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SLOVENIAN_CITIES,
  PAYMENT_TERMS_OPTIONS,
  COUNTRY_OPTIONS,
} from '@/types/dentist';

// Schema factory function to support translated validation messages
const createDentistFormSchema = (t: any) => z.object({
  clinicName: z.string().min(1, t('dentist.validationClinicNameRequired')).max(200),
  dentistName: z.string().min(1, t('dentist.validationDentistNameRequired')).max(200),
  licenseNumber: z.string().max(100).optional(),
  email: z.string().email(t('dentist.validationEmailInvalid')).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().min(1, t('dentist.validationCityRequired')).max(100),
  postalCode: z.string().min(1, t('dentist.validationPostalCodeRequired')).max(20),
  country: z.string().max(100),
  taxNumber: z.string().max(50).optional(),
  businessRegistration: z.string().max(50).optional(),
  paymentTerms: z.number().int().min(1).max(365),
  requiresInvoicing: z.boolean(),
  notes: z.string().max(5000).optional(),
  active: z.boolean(),
});

type DentistFormValues = z.infer<ReturnType<typeof createDentistFormSchema>>;

interface DentistFormProps {
  dentist?: Dentist | null;
  onSubmit: (data: DentistFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function DentistForm({
  dentist,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DentistFormProps) {
  const t = useTranslations();

  const form = useForm<DentistFormValues>({
    resolver: zodResolver(createDentistFormSchema(t)),
    defaultValues: {
      clinicName: dentist?.clinicName || '',
      dentistName: dentist?.dentistName || '',
      licenseNumber: dentist?.licenseNumber || '',
      email: dentist?.email || '',
      phone: dentist?.phone || '',
      address: dentist?.address || '',
      city: dentist?.city || '',
      postalCode: dentist?.postalCode || '',
      country: dentist?.country || 'Slovenia',
      taxNumber: dentist?.taxNumber || '',
      businessRegistration: dentist?.businessRegistration || '',
      paymentTerms: dentist?.paymentTerms || 30,
      requiresInvoicing: dentist?.requiresInvoicing !== undefined ? dentist.requiresInvoicing : true,
      notes: dentist?.notes || '',
      active: dentist?.active !== undefined ? dentist.active : true,
    },
  });

  const handleSubmit = async (data: DentistFormValues) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dentist.formBasicInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="clinicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formClinicNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formClinicNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dentistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formDentistNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formDentistNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formLicenseNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formLicenseNumberPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('dentist.formLicenseNumberDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('dentist.formActiveStatusLabel')}</FormLabel>
                      <FormDescription>
                        {t('dentist.formActiveStatusDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dentist.formContactInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formEmailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('dentist.formEmailPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formPhoneLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formPhonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('dentist.formAddressLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('dentist.formAddressPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formCityLabel')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dentist.formCityPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {SLOVENIAN_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('dentist.formCityDescription')}
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder={t('dentist.formCityInputPlaceholder')}
                        value={field.value}
                        onChange={field.onChange}
                        className="mt-2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formPostalCodeLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formPostalCodePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('dentist.formCountryLabel')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dentist.formCountryPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dentist.formBusinessSettings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formTaxNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formTaxNumberPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('dentist.formTaxNumberDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formBusinessRegLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dentist.formBusinessRegPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('dentist.formBusinessRegDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dentist.formPaymentTermsLabel')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dentist.formPaymentTermsPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('dentist.formPaymentTermsDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresInvoicing"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t('dentist.formRequiresInvoiceLabel')}</FormLabel>
                      <FormDescription>
                        {t('dentist.formRequiresInvoiceDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t('dentist.formNotesLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('dentist.formNotesPlaceholder')}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('dentist.formNotesDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('dentist.formCancelButton')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('dentist.formSavingButton')
              : dentist
              ? t('dentist.formUpdateButton')
              : t('dentist.formCreateButton')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
