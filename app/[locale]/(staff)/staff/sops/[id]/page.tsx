'use client';

/**
 * Staff SOP Detail Page
 *
 * View SOP content and acknowledge understanding
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RichTextEditor } from '@/components/sops/RichTextEditor';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Download,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  content: string;
  versionNumber: string;
  approvedAt: string;
  approvedBy: {
    name: string;
  };
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export default function StaffSOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const [sopId, setSOPId] = useState<string | null>(null);
  const [sop, setSOP] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const response = await fetch(`/api/staff/sops/${sopId}`);
      if (response.ok) {
        const data = await response.json();
        setSOP(data);
      } else {
        setError(t('sopNotFound'));
      }
    } catch (err) {
      console.error('Fetch SOP error:', err);
      setError(t('sopNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!sopId) return;

    setAcknowledging(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/sops/${sopId}/acknowledge`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess(t('acknowledgedSuccessfully'));
        setAcknowledgeDialogOpen(false);
        fetchSOP(); // Refresh to show acknowledged status
      } else {
        const data = await response.json();
        setError(data.error || t('sopNotFound'));
      }
    } catch (err) {
      console.error('Acknowledge error:', err);
      setError(t('sopNotFound'));
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!sopId) return;

    try {
      const response = await fetch(`/api/sops/${sopId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sop?.code}_v${sop?.versionNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(t('sopNotFound'));
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      setError(t('sopNotFound'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('sopNotFound')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push(`/${locale}/staff/sops`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToSOPs')}
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
            onClick={() => router.push(`/${locale}/staff/sops`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToSOPs')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-gray-900">{sop.code}</h1>
              {sop.acknowledged ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('acknowledged')}
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-800">{t('pending')}</Badge>
              )}
            </div>
            <p className="text-gray-500 mt-1">{t('version')} {sop.versionNumber}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            {t('downloadPDF')}
          </Button>
          {!sop.acknowledged && (
            <Button onClick={() => setAcknowledgeDialogOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('acknowledge')}
            </Button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* SOP Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('sopInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('title')}</div>
              <div className="font-medium">{sop.title}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('category')}</div>
              <Badge variant="outline">{sop.category}</Badge>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('version')}</div>
              <div className="font-medium">{sop.versionNumber}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('approvalStatus')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('approvedBy')}</div>
                <div className="font-medium">{sop.approvedBy.name}</div>
                <div className="text-sm text-gray-500">
                  {format(new Date(sop.approvedAt), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>

            {sop.acknowledged && sop.acknowledgedAt && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">{t('youAcknowledged')}</div>
                  <div className="text-sm text-gray-900">
                    {format(new Date(sop.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SOP Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sopContent')}</CardTitle>
          <CardDescription>
            {t('readBeforeAcknowledging')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor content={sop.content} onChange={() => {}} editable={false} />
        </CardContent>
      </Card>

      {/* Acknowledgment Dialog */}
      <AlertDialog open={acknowledgeDialogOpen} onOpenChange={setAcknowledgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('acknowledgeSOP')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('acknowledgeConfirmation')}: <strong>{sop.code} - {sop.title}</strong>
              <br />
              <br />
              {t('acknowledgeRecorded')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acknowledging}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledge} disabled={acknowledging}>
              {acknowledging ? t('acknowledging') : t('iAcknowledge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
