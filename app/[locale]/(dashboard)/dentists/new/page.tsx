'use client';

/**
 * New Dentist Page
 *
 * Create new dentist/clinic.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DentistForm } from '@/components/dentists/DentistForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

export default function NewDentistPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dentists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('dentist.toastErrorCreate'));
      }

      const dentist = await response.json();

      toast({
        title: t('dentist.toastSuccessTitle'),
        description: t('dentist.toastSuccessCreate'),
      });

      // Redirect to dentist detail page
      router.push(`/dentists/${dentist.id}`);
    } catch (error: any) {
      toast({
        title: t('dentist.toastErrorTitle'),
        description: error.message || t('dentist.toastErrorCreate'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dentists');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dentists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('dentist.backToDentists')}
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t('dentist.createTitle')}</h1>
        <p className="text-gray-500 mt-1">
          {t('dentist.createSubtitle')}
        </p>
      </div>

      {/* Form */}
      <DentistForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
