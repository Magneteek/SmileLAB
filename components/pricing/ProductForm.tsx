/**
 * Product Form Component
 *
 * Create or edit product with validation.
 * Uses React Hook Form + Zod for validation.
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

// Note: Validation messages are kept in English as they're shown in the console/dev tools
// User-facing validation errors are shown via FormMessage component using translation keys
const productFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Product code is required')
    .max(50, 'Product code too long')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and hyphens only'),
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
  const isEdit = !!product;

  console.log('[ProductForm] Rendering with product:', product);
  console.log('[ProductForm] Category from product:', product?.category);
  console.log('[ProductForm] Unit from product:', product?.unit);

  const defaultValues = {
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || ProductCategory.CROWN,
    currentPrice: product ? parseFloat(product.currentPrice.toString()) : 0,
    unit: product?.unit || 'piece',
    active: product?.active !== undefined ? product.active : true,
  };

  console.log('[ProductForm] Default values:', defaultValues);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  // Reset form when product data changes (important for edit mode when data loads asynchronously)
  useEffect(() => {
    if (product) {
      console.log('[ProductForm] Product changed, resetting form with:', product);
      form.reset({
        code: product.code || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || ProductCategory.CROWN,
        currentPrice: parseFloat(product.currentPrice.toString()),
        unit: product.unit || 'piece',
        active: product.active !== undefined ? product.active : true,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormValues) => {
    console.log('[ProductForm] Submitting:', { isEdit, productId: product?.id, data });
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/products/${product.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      console.log('[ProductForm] Fetching:', { url, method });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('[ProductForm] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[ProductForm] Error response:', error);

        if (error.details) {
          // Validation errors
          console.log('[ProductForm] Validation errors:', error.details);
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
      console.log('[ProductForm] Save successful:', savedProduct.id);
      onSuccess(savedProduct.id);
    } catch (error) {
      console.error('[ProductForm] Exception:', error);
      alert('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-format code on blur
  const handleCodeBlur = () => {
    const currentCode = form.getValues('code');
    if (currentCode) {
      form.setValue('code', currentCode.toUpperCase().trim());
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Code */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('productCodeLabel')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('productCodePlaceholder')}
                  onBlur={handleCodeBlur}
                  className="font-mono uppercase"
                  maxLength={7}
                />
              </FormControl>
              <FormDescription>
                {t('productCodeDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

        {/* Category and Price Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('categoryLabel')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCategoryPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(['CROWN', 'BRIDGE', 'FILLING', 'IMPLANT', 'DENTURE', 'INLAY', 'ONLAY', 'VENEER', 'SPLINT', 'PROVISIONAL', 'TEMPLATE', 'ABUTMENT', 'SERVICE', 'REPAIR', 'MODEL'] as ProductCategory[]).map((category) => (
                      <SelectItem key={category} value={category}>
                        {t(`category${category}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

        {/* Unit and Active Row */}
        <div className="grid grid-cols-2 gap-4">
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
                    {['piece', 'hour', 'gram', 'ml'].map((unit) => (
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
        </div>

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
          <Button type="submit" disabled={submitting}>
            {submitting ? t('saving') : isEdit ? t('updateProduct') : t('createProduct')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
