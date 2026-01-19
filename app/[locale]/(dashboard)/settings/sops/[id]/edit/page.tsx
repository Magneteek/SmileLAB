'use client';

/**
 * Edit SOP Page
 *
 * Form for editing existing SOPs
 * - DRAFT SOPs: Direct update
 * - APPROVED SOPs: Creates new version, archives old one
 * Admin access only
 */

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/sops/RichTextEditor';
import { ArrowLeft, Save, AlertCircle, Info } from 'lucide-react';

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

const updateSOPSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(1, 'Please select a category'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
});

type UpdateSOPForm = z.infer<typeof updateSOPSchema>;

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  content: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  versionNumber: string;
}

export default function EditSOPPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [sopId, setSOPId] = useState<string | null>(null);
  const [sop, setSOP] = useState<SOP | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
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
  } = useForm<UpdateSOPForm>({
    resolver: zodResolver(updateSOPSchema),
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    params.then(({ id }) => {
      setSOPId(id);
    });
  }, [params]);

  useEffect(() => {
    if (sopId) {
      fetchSOP();
    }
  }, [sopId]);

  const fetchSOP = async () => {
    if (!sopId) return;

    try {
      const response = await fetch(`/api/sops/${sopId}`);
      if (response.ok) {
        const data = await response.json();
        setSOP(data);
        setValue('title', data.title);
        setValue('category', data.category);
        setValue('content', data.content);
        setContent(data.content);
      } else {
        setError('Failed to load SOP');
      }
    } catch (err) {
      console.error('Fetch SOP error:', err);
      setError('Failed to load SOP');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UpdateSOPForm) => {
    if (!sopId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/sops/${sopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedSOP = await response.json();
        router.push(`/${locale}/settings/sops/${updatedSOP.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update SOP');
      }
    } catch (err) {
      console.error('Update SOP error:', err);
      setError('Failed to update SOP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (html: string) => {
    setContent(html);
    setValue('content', html, { shouldValidate: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('sop.editPage.loadingSOP')}</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('sop.editPage.sopNotFound')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push(`/${locale}/settings/sops`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('sop.createPage.backToSOPs')}
        </Button>
      </div>
    );
  }

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
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-gray-900">{t('sop.editPage.title')}</h1>
              <Badge className={STATUS_COLORS[sop.status]}>{t(`sop.status.${sop.status}`)}</Badge>
            </div>
            <p className="text-gray-500 mt-1">{sop.code} - {t('sop.detailPage.version')} {sop.versionNumber}</p>
          </div>
        </div>
      </div>

      {/* Versioning Info */}
      {sop.status === 'APPROVED' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('sop.editPage.versioningInfo')}
          </AlertDescription>
        </Alert>
      )}

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
              <CardDescription>{t('sop.table.code')}: {sop.code}</CardDescription>
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
                  {sop.status === 'APPROVED'
                    ? t('sop.editPage.saveNote')
                    : t('sop.editPage.draftNote')}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/${locale}/settings/sops/${sop.id}`)}
                    disabled={isSubmitting}
                  >
                    {t('sop.createPage.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? t('sop.editPage.saving') : t('sop.editPage.saveButton')}
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
