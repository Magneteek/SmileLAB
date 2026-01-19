/**
 * Edit Product Page
 *
 * Edit an existing product with form validation and API integration.
 *
 * Route: /pricing/[id]/edit
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import ProductForm from '@/components/pricing/ProductForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Product } from '@prisma/client';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('pricing');
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
          throw new Error('Failed to load product');
        }

        const data = await response.json();
        console.log('[EditProductPage] Fetched product:', data);
        console.log('[EditProductPage] Category:', data.category, 'Unit:', data.unit);
        setProduct(data);
      } catch (err: any) {
        console.error('Failed to fetch product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">{t('loadingProduct')}</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-6 space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || t('productNotFound')}
          </AlertDescription>
        </Alert>
        <Link href="/pricing">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToPricingList')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/pricing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToPricingList')}
          </Button>
        </Link>
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t('editProductTitle')}</h1>
          <p className="text-gray-600 mt-1">
            {t('editProductSubtitle', { code: product.code })}
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm
        product={product}
        onSuccess={() => router.push('/pricing')}
        onCancel={() => router.push('/pricing')}
      />
    </div>
  );
}
