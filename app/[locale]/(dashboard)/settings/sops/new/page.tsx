'use client';

/**
 * Create SOP Page
 *
 * Form for creating new Standard Operating Procedures
 * Admin access only
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/sops/RichTextEditor';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const createSOPSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(1, 'Please select a category'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
});

type CreateSOPForm = z.infer<typeof createSOPSchema>;

export default function CreateSOPPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CATEGORY_OPTIONS = [
    { value: 'PRODUCTION', label: t('sop.category.PRODUCTION') },
    { value: 'EQUIPMENT', label: t('sop.category.EQUIPMENT') },
    { value: 'MATERIAL', label: t('sop.category.MATERIAL') },
    { value: 'QUALITY', label: t('sop.category.QUALITY') },
    { value: 'DOCUMENTATION', label: t('sop.category.DOCUMENTATION') },
    { value: 'PERSONNEL', label: t('sop.category.PERSONNEL') },
    { value: 'RISK_MANAGEMENT', label: t('sop.category.RISK_MANAGEMENT') },
    { value: 'OTHER', label: t('sop.category.OTHER') },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateSOPForm>({
    resolver: zodResolver(createSOPSchema),
    defaultValues: {
      title: '',
      category: '',
      content: '',
    },
  });

  const selectedCategory = watch('category');

  const onSubmit = async (data: CreateSOPForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/sops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const sop = await response.json();
        router.push(`/${locale}/settings/sops/${sop.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create SOP');
      }
    } catch (err) {
      console.error('Create SOP error:', err);
      setError('Failed to create SOP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (html: string) => {
    setContent(html);
    setValue('content', html, { shouldValidate: true });
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}/settings/sops`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('sop.createPage.backToSOPs')}
          </Button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{t('sop.createPage.title')}</h1>
            <p className="text-gray-500 mt-1">
              {t('sop.createPage.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sop.createPage.basicInfo')}</CardTitle>
              <CardDescription>
                {t('sop.createPage.basicInfoDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t('sop.createPage.sopTitle')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={t('sop.createPage.sopTitlePlaceholder')}
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  {t('sop.createPage.sopCategory')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setValue('category', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('sop.createPage.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SOP Content */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sop.createPage.sopContent')}</CardTitle>
              <CardDescription>
                {t('sop.createPage.contentDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">
                  {t('sop.createPage.contentLabel')} <span className="text-red-500">*</span>
                </Label>
                <RichTextEditor
                  content={content}
                  onChange={handleContentChange}
                  placeholder={t('sop.createPage.contentPlaceholder')}
                />
                {errors.content && (
                  <p className="text-sm text-red-500 mt-2">{errors.content.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {t('sop.createPage.saveNote')}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/${locale}/settings/sops`)}
                    disabled={isSubmitting}
                  >
                    {t('sop.createPage.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? t('sop.createPage.creating') : t('sop.createPage.createButton')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
