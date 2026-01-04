/**
 * New Product Page
 *
 * Create a new product with form validation and API integration.
 *
 * Route: /pricing/new
 */

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/pricing/ProductForm';
import { Button } from '@/components/ui/button';

export default function NewProductPage() {
  const router = useRouter();
  const t = useTranslations('pricing');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/pricing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToPricingList')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('addNewProductTitle')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('addNewProductSubtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm
        onSuccess={() => router.push('/pricing')}
        onCancel={() => router.push('/pricing')}
      />
    </div>
  );
}
