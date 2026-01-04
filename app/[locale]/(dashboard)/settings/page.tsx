'use client';

/**
 * Laboratory Configuration Settings Page
 *
 * Manages laboratory/manufacturer information and bank accounts
 * for Annex XIII compliance and invoicing
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  Building2,
  Plus,
  Trash2,
  Edit,
  Star,
  StarOff,
  GripVertical,
  FileEdit,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Validation schema for lab configuration
const labConfigSchema = z.object({
  // Laboratory Information
  laboratoryName: z.string().min(1, 'Laboratory name is required'),
  laboratoryId: z.string().optional(),
  laboratoryLicense: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  technicianIdNumber: z.string().optional(),

  // Address
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().optional(),
  region: z.string().optional(),

  // Contact
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Responsible Person
  responsiblePersonName: z.string().min(1, 'Responsible person name is required'),
  responsiblePersonTitle: z.string().min(1, 'Responsible person title is required'),
  responsiblePersonLicense: z.string().optional(),
  responsiblePersonEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  responsiblePersonPhone: z.string().optional(),

  // Files
  logoPath: z.string().optional(),
  signaturePath: z.string().optional(),

  // Settings
  defaultPaymentTerms: z.coerce.number().min(1, 'Payment terms must be at least 1 day').optional(),
  defaultTaxRate: z.coerce.number().min(0).max(100, 'Tax rate must be between 0 and 100').optional(),

  // Invoice Legal Terms
  invoiceLegalTerms: z.string().optional(),
});

// Bank account schema
const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  iban: z.string().min(1, 'IBAN is required'),
  swiftBic: z.string().optional(),
  accountType: z.string().optional(),
  notes: z.string().optional(),
});

type LabConfigFormData = z.infer<typeof labConfigSchema>;
type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  swiftBic?: string;
  accountType?: string;
  isPrimary: boolean;
  isActive: boolean;
  displayOrder: number;
  notes?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [configExists, setConfigExists] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);

  const form = useForm<LabConfigFormData>({
    resolver: zodResolver(labConfigSchema),
    defaultValues: {
      laboratoryName: '',
      laboratoryId: '',
      laboratoryLicense: '',
      registrationNumber: '',
      taxId: '',
      technicianIdNumber: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Slovenia',
      region: '',
      phone: '',
      email: '',
      website: '',
      responsiblePersonName: '',
      responsiblePersonTitle: '',
      responsiblePersonLicense: '',
      responsiblePersonEmail: '',
      responsiblePersonPhone: '',
      logoPath: '',
      signaturePath: '',
      defaultPaymentTerms: 30,
      defaultTaxRate: 22.0,
      invoiceLegalTerms: 'Znesek računa plačajte v navedenem roku sicer bomo zaračunali zakonske zamudne obresti.\n\nV skladu s prvim odstavkom 94.člena z DDV-1 opravljam dejavnost oproščeno obračunavanja DDV.\n\nIzjavljam in prevzemam vso odgovornost za skladnost izdelka(ov) z bistvenimi zahtevami Pravilnika o medicinskih pripomočkih (Ur. l. RS št. 71/03).\n\nObveznosti za pogojnih zavez (UL) R.S. št 54/2021) ter Uredbe (UE) R.S. št 2017/745 o medicinskih pripomočkih.',
    },
  });

  const bankForm = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankName: '',
      iban: '',
      accountType: 'PRIMARY',
    },
  });

  // Load existing configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('Fetching lab configuration...');
        const response = await fetch('/api/settings/lab-configuration');
        console.log('Fetch response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded lab configuration:', data);
          setConfigExists(true);

          // Convert null values to empty strings for form fields
          const formData: Partial<LabConfigFormData> = {
            laboratoryName: data.laboratoryName || '',
            laboratoryId: data.laboratoryId || '',
            laboratoryLicense: data.laboratoryLicense || '',
            registrationNumber: data.registrationNumber || '',
            taxId: data.taxId || '',
            technicianIdNumber: data.technicianIdNumber || '',
            street: data.street || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Slovenia',
            region: data.region || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            responsiblePersonName: data.responsiblePersonName || '',
            responsiblePersonTitle: data.responsiblePersonTitle || '',
            responsiblePersonLicense: data.responsiblePersonLicense || '',
            responsiblePersonEmail: data.responsiblePersonEmail || '',
            responsiblePersonPhone: data.responsiblePersonPhone || '',
            logoPath: data.logoPath || '',
            signaturePath: data.signaturePath || '',
            defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
            defaultTaxRate: data.defaultTaxRate ?? 22.0,
            invoiceLegalTerms: data.invoiceLegalTerms || 'Znesek računa plačajte v navedenem roku sicer bomo zaračunali zakonske zamudne obresti.\n\nV skladu s prvim odstavkom 94.člena z DDV-1 opravljam dejavnost oproščeno obračunavanja DDV.\n\nIzjavljam in prevzemam vso odgovornost za skladnost izdelka(ov) z bistvenimi zahtevami Pravilnika o medicinskih pripomočkih (Ur. l. RS št. 71/03).\n\nObveznosti za pogojnih zavez (UL) R.S. št 54/2021) ter Uredbe (UE) R.S. št 2017/745 o medicinskih pripomočkih.',
          };

          console.log('Populating form with cleaned data:', formData);

          // Reset form with cleaned data
          form.reset(formData);

          // Set bank accounts
          if (data.bankAccounts) {
            console.log('Loaded bank accounts:', data.bankAccounts);
            setBankAccounts(data.bankAccounts);
          }
        } else if (response.status === 404) {
          console.log('No lab configuration found (404)');
          setConfigExists(false);
        } else {
          console.error('Unexpected response status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch configuration:', error);
        toast({
          title: t('toastErrorTitle'),
          description: t('toastConfigLoadFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchConfig();
  }, [form, toast]);

  const onSubmit = async (data: LabConfigFormData) => {
    console.log('Form submitted with data:', data);
    setIsLoading(true);

    try {
      const url = '/api/settings/lab-configuration';
      const method = configExists ? 'PATCH' : 'POST';

      console.log('Sending request:', { method, url, data });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Response error:', errorData);
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      const result = await response.json();
      console.log('Response data:', result);

      toast({
        title: t('toastSuccessTitle'),
        description: t('toastConfigSaved'),
      });

      setConfigExists(true);
      if (result.bankAccounts) {
        setBankAccounts(result.bankAccounts);
      }

      router.refresh();
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      toast({
        title: t('toastErrorTitle'),
        description: error.message || 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBank = () => {
    setEditingBank(null);
    bankForm.reset({
      bankName: '',
      iban: '',
      accountType: 'PRIMARY',
    });
    setShowBankDialog(true);
  };

  const handleEditBank = (account: BankAccount) => {
    setEditingBank(account);
    bankForm.reset({
      bankName: account.bankName,
      iban: account.iban,
      swiftBic: account.swiftBic || '',
      accountType: account.accountType || 'PRIMARY',
      notes: account.notes || '',
    });
    setShowBankDialog(true);
  };

  const handleBankSubmit = async (data: BankAccountFormData) => {
    try {
      if (editingBank) {
        // Update existing
        const response = await fetch(`/api/settings/bank-accounts/${editingBank.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update bank account');

        const updated = await response.json();
        setBankAccounts(prev =>
          prev.map(acc => (acc.id === editingBank.id ? updated : acc))
        );

        toast({
          title: t('toastSuccessTitle'),
          description: 'Bank account updated successfully',
        });
      } else {
        // Create new
        const response = await fetch('/api/settings/bank-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to add bank account');

        const newAccount = await response.json();
        setBankAccounts(prev => [...prev, newAccount]);

        toast({
          title: t('toastSuccessTitle'),
          description: 'Bank account added successfully',
        });
      }

      setShowBankDialog(false);
    } catch (error) {
      console.error('Failed to save bank account:', error);
      toast({
        title: t('toastErrorTitle'),
        description: t('toastBankSaveFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/bank-accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bank account');

      setBankAccounts(prev => prev.filter(acc => acc.id !== id));

      toast({
        title: t('toastSuccessTitle'),
        description: 'Bank account deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete bank account:', error);
      toast({
        title: t('toastErrorTitle'),
        description: t('toastBankDeleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setDeletingBankId(null);
    }
  };

  const handleTogglePrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/bank-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) throw new Error('Failed to set primary account');

      // Refresh config to get updated bank accounts
      const configResponse = await fetch('/api/settings/lab-configuration');
      if (configResponse.ok) {
        const data = await configResponse.json();
        setBankAccounts(data.bankAccounts || []);
      }

      toast({
        title: t('toastSuccessTitle'),
        description: 'Primary account updated',
      });
    } catch (error) {
      console.error('Failed to update primary account:', error);
      toast({
        title: t('toastErrorTitle'),
        description: t('toastPrimaryUpdateFailed'),
        variant: 'destructive',
      });
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
        </div>
        <p className="text-gray-600">
          {t('pageDescription')}
        </p>
      </div>

      {/* Lab Configuration Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('labInfoTitle')}</CardTitle>
          <CardDescription>
            {t('labInfoDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Laboratory Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionLabDetails')}</h3>

                <FormField
                  control={form.control}
                  name="laboratoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('laboratoryName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('laboratoryNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="laboratoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('laboratoryId')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('laboratoryIdPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="laboratoryLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('laboratoryLicense')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('laboratoryLicensePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="technicianIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('technicianIdNumber')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('technicianIdNumberPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('registrationNumber')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('registrationNumberPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('taxId')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('taxIdPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionAddress')}</h3>

                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('streetAddress')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('streetAddressPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('city')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('cityPlaceholder')} {...field} />
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
                        <FormLabel>{t('postalCode')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('postalCodePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('country')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('countryPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('region')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('regionPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionContact')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('phone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('phonePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('website')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('websitePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Responsible Person Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionResponsiblePerson')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsiblePersonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('responsiblePersonName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('responsiblePersonNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePersonTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('responsiblePersonTitle')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('responsiblePersonTitlePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePersonLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('responsiblePersonLicense')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('responsiblePersonLicensePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePersonEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('responsiblePersonEmail')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('responsiblePersonEmailPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePersonPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('responsiblePersonPhone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('responsiblePersonPhonePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Files & Assets Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionFilesAssets')}</h3>
                <p className="text-sm text-gray-600">{t('sectionFilesDescription')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t('logo')}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {form.watch('logoPath') ? (
                        <div className="space-y-3">
                          <img
                            src={form.watch('logoPath')?.replace(/^\/en\//, '/') || ''}
                            alt="Laboratory Logo"
                            className="max-h-32 mx-auto"
                            onError={(e) => {
                              // Just hide broken image, don't clear the path
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const input = document.getElementById('logo-upload') as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            {t('replaceLogo')}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">{t('noLogoUploaded')}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const input = document.getElementById('logo-upload') as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            Upload Logo
                          </Button>
                        </div>
                      )}
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('type', 'logo');

                            try {
                              const response = await fetch('/api/settings/upload', {
                                method: 'POST',
                                body: formData,
                              });

                              if (response.ok) {
                                const data = await response.json();
                                form.setValue('logoPath', data.path);

                                // Auto-save the form to persist the logo path
                                const currentFormData = form.getValues();
                                const saveResponse = await fetch('/api/settings/lab-configuration', {
                                  method: configExists ? 'PATCH' : 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(currentFormData),
                                });

                                if (saveResponse.ok) {
                                  toast({
                                    title: t('toastSuccessTitle'),
                                    description: t('toastLogoUploadSuccess'),
                                  });
                                } else {
                                  throw new Error('Failed to save logo path');
                                }
                              } else {
                                throw new Error('Upload failed');
                              }
                            } catch (error) {
                              toast({
                                title: t('toastErrorTitle'),
                                description: t('toastLogoUploadFailed'),
                                variant: 'destructive',
                              });
                            }
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{t('logoFormatHint')}</p>
                  </div>

                  {/* Signature Upload */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t('signature')}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {form.watch('signaturePath') ? (
                        <div className="space-y-3">
                          <img
                            src={form.watch('signaturePath')?.replace(/^\/en\//, '/') || ''}
                            alt="Signature"
                            className="max-h-32 mx-auto"
                            onError={(e) => {
                              // Just hide broken image, don't clear the path
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const input = document.getElementById('signature-upload') as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            {t('replaceSignature')}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileEdit className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">{t('noSignatureUploaded')}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const input = document.getElementById('signature-upload') as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            Upload Signature
                          </Button>
                        </div>
                      )}
                      <input
                        id="signature-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('type', 'signature');

                            try {
                              const response = await fetch('/api/settings/upload', {
                                method: 'POST',
                                body: formData,
                              });

                              if (response.ok) {
                                const data = await response.json();
                                form.setValue('signaturePath', data.path);

                                // Auto-save the form to persist the signature path
                                const currentFormData = form.getValues();
                                const saveResponse = await fetch('/api/settings/lab-configuration', {
                                  method: configExists ? 'PATCH' : 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(currentFormData),
                                });

                                if (saveResponse.ok) {
                                  toast({
                                    title: t('toastSuccessTitle'),
                                    description: t('toastSignatureUploadSuccess'),
                                  });
                                } else {
                                  throw new Error('Failed to save signature path');
                                }
                              } else {
                                throw new Error('Upload failed');
                              }
                            } catch (error) {
                              toast({
                                title: t('toastErrorTitle'),
                                description: t('toastSignatureUploadFailed'),
                                variant: 'destructive',
                              });
                            }
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{t('signatureFormatHint')}</p>
                  </div>
                </div>
              </div>

              {/* Settings Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionDefaultSettings')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultPaymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('defaultPaymentTerms')}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t('defaultPaymentTermsPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('defaultPaymentTermsDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultTaxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('defaultTaxRate')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t('defaultTaxRatePlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('defaultTaxRateDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Invoice Legal Terms Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('sectionInvoiceLegalTerms')}</h3>
                <p className="text-sm text-gray-600">
                  Legal text displayed at the bottom of invoices. Each paragraph will be displayed on a new line.
                </p>

                <FormField
                  control={form.control}
                  name="invoiceLegalTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('legalTermsText')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('legalTermsPlaceholder')}
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This text appears at the bottom of all invoices. Use line breaks to separate paragraphs for better readability.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('saveConfiguration')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Bank Accounts Section */}
      {!configExists && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">Bank Accounts</p>
              <p className="text-sm mt-2">
                Save the laboratory configuration first to manage bank accounts
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {configExists && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('bankAccountsTitle')}</CardTitle>
                <CardDescription>
                  Manage bank accounts for invoice display. Multiple accounts can be added.
                </CardDescription>
              </div>
              <Button onClick={handleAddBank}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addBankAccount')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bankAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{t('noBankAccounts')}</p>
                <p className="text-sm">{t('addFirstBankAccount')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">{t('tableHeaderPrimary')}</TableHead>
                    <TableHead>{t('tableHeaderBank')}</TableHead>
                    <TableHead>{t('tableHeaderIban')}</TableHead>
                    <TableHead>{t('tableHeaderSwift')}</TableHead>
                    <TableHead>{t('tableHeaderType')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePrimary(account.id)}
                            className="p-0 h-auto"
                          >
                            {account.isPrimary ? (
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            ) : (
                              <StarOff className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{account.bankName}</TableCell>
                        <TableCell>{account.iban}</TableCell>
                        <TableCell>{account.swiftBic || '-'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {account.accountType || 'PRIMARY'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBank(account)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingBankId(account.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Account Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? t('dialogEditBankTitle') : t('dialogAddBankTitle')}</DialogTitle>
            <DialogDescription>
              Enter bank account details for invoice display
            </DialogDescription>
          </DialogHeader>

          <Form {...bankForm}>
            <form onSubmit={bankForm.handleSubmit(handleBankSubmit)} className="space-y-4">
              <FormField
                control={bankForm.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('bankNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bankForm.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('iban')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('ibanPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>
                      International Bank Account Number (e.g., SI56 0110 0100 0123 456)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bankForm.control}
                name="swiftBic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('swiftBic')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('swiftBicPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bankForm.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('accountType')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('accountTypePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bankForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankNotes')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('bankNotesPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBankDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBank ? 'Update' : 'Add'} Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingBankId} onOpenChange={() => setDeletingBankId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogDeleteBankTitle')}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBankId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingBankId && handleDeleteBank(deletingBankId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
