/**
 * Product Form Component
 *
 * Create or edit product with validation.
 * Uses React Hook Form + Zod for validation.
 * Auto-generates product code based on category.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import type { Product } from '@prisma/client';
import { ProductCategory } from '@prisma/client';
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
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Note: Validation messages are kept in English as they're shown in the console/dev tools
// User-facing validation errors are shown via FormMessage component using translation keys
const productFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Product code is required')
    .max(20, 'Product code must be 20 characters or less'),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  category: z.nativeEnum(ProductCategory),
  currentPrice: z
    .number()
    .positive('Price must be positive')
    .min(0.01, 'Price must be at least 0.01'),
  unit: z.string().min(1, 'Unit is required'),
  active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: (productId: string) => void;
  onCancel: () => void;
}

export default function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const t = useTranslations('pricing');
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const isEdit = !!product;

  const defaultValues = {
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || ProductCategory.FIKSNA_PROTETIKA,
    currentPrice: product ? parseFloat(product.currentPrice.toString()) : 0,
    unit: product?.unit || 'piece',
    active: product?.active !== undefined ? product.active : true,
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const currentCategory = form.watch('category');

  // Auto-generate code when category changes (only for new products)
  useEffect(() => {
    if (isEdit) return; // Don't regenerate for existing products

    const generateCode = async () => {
      setIsGeneratingCode(true);
      try {
        const response = await fetch(`/api/products/generate-code?category=${currentCategory}`);
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
  }, [currentCategory, isEdit, form]);

  // Reset form when product data changes (important for edit mode when data loads asynchronously)
  useEffect(() => {
    if (product) {
      form.reset({
        code: product.code || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || ProductCategory.FIKSNA_PROTETIKA,
        currentPrice: parseFloat(product.currentPrice.toString()),
        unit: product.unit || 'piece',
        active: product.active !== undefined ? product.active : true,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/products/${product.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        if (error.details) {
          // Validation errors
          error.details.forEach((detail: any) => {
            form.setError(detail.path[0] as any, {
              message: detail.message,
            });
          });
        } else {
          alert(error.error || 'Failed to save product');
        }
        return;
      }

      const savedProduct = await response.json();
      onSuccess(savedProduct.id);
    } catch (error) {
      console.error('[ProductForm] Exception:', error);
      alert('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Category - Now first for auto-code generation */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('categoryLabel')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategoryPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(['FIKSNA_PROTETIKA', 'SNEMNA_PROTETIKA', 'IMPLANTOLOGIJA', 'ESTETIKA', 'OSTALO'] as ProductCategory[]).map((category) => (
                      <SelectItem key={category} value={category}>
                        {t(`category${category}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEdit && (
                  <FormDescription>{t('categoryCannotChange')}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Product Code - Auto-generated */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('productCodeLabel')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      readOnly
                      className="font-mono uppercase bg-muted"
                    />
                    {isGeneratingCode && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  {t('productCodeAutoGenerated')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Product Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productNameLabel')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('productNamePlaceholder')} maxLength={200} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                  maxLength={1000}
                />
              </FormControl>
              <FormDescription>
                {t('descriptionCharacterCount', { count: field.value?.length || 0 })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price and Unit Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Price */}
          <FormField
            control={form.control}
            name="currentPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('priceLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    placeholder={t('pricePlaceholder')}
                  />
                </FormControl>
                <FormDescription>
                  {isEdit && t('priceHistoryNote')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unit */}
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('unitLabel')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectUnitPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['piece', 'hour', 'gram', 'ml', 'teeth'].map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {t(`unit${unit.charAt(0).toUpperCase() + unit.slice(1)}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Active Status */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t('activeLabel')}</FormLabel>
                <FormDescription>
                  {t('activeDescription')}
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

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={submitting || isGeneratingCode}>
            {submitting ? t('saving') : isEdit ? t('updateProduct') : t('createProduct')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
