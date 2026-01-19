'use client';

/**
 * SOP Detail Page
 *
 * View SOP details, content, metadata, and version history
 * Admin/QC access only
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
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Clock,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  content: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  versionNumber: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  createdBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  acknowledgments?: Array<{
    id: string;
    userId: string;
    acknowledgedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  previousVersionId?: string;
}

interface VersionHistory {
  id: string;
  versionNumber: string;
  status: string;
  createdAt: string;
  createdBy: {
    name: string;
  };
}

export default function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [sopId, setSOPId] = useState<string | null>(null);
  const [sop, setSOP] = useState<SOP | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch version history if this SOP has previous versions
        if (data.code) {
          fetchVersionHistory(data.code);
        }
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

  const fetchVersionHistory = async (code: string) => {
    try {
      const response = await fetch(`/api/sops?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current version and sort by version number desc
        const history = data
          .filter((v: SOP) => v.id !== sopId)
          .sort((a: SOP, b: SOP) => b.versionNumber.localeCompare(a.versionNumber));
        setVersionHistory(history);
      }
    } catch (err) {
      console.error('Fetch version history error:', err);
    }
  };

  const handleApprove = async () => {
    if (!sopId) return;

    setApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/sops/${sopId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSOP(); // Refresh data
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to approve SOP');
      }
    } catch (err) {
      console.error('Approve error:', err);
      setError('Failed to approve SOP');
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!sopId) return;

    try {
      const response = await fetch(`/api/sops/${sopId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/${locale}/settings/sops`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete SOP');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete SOP');
    }
    setDeleteDialogOpen(false);
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
        setError('Failed to generate PDF');
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      setError('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('sop.detailPage.loadingSOP')}</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="space-y-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('sop.detailPage.sopNotFound')}</AlertDescription>
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
              <h1 className="text-sm font-bold text-gray-900">{sop.code}</h1>
              <Badge className={STATUS_COLORS[sop.status]}>{t(`sop.status.${sop.status}`)}</Badge>
            </div>
            <p className="text-gray-500 mt-1">{t('sop.detailPage.version')} {sop.versionNumber}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Download PDF - Available for all statuses */}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            {t('sop.detailPage.downloadPDF')}
          </Button>

          {sop.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/settings/sops/${sop.id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('sop.actions.edit')}
              </Button>
              <Button onClick={handleApprove} disabled={approving}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {approving ? t('sop.detailPage.approving') : t('sop.actions.approve')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('sop.actions.delete')}
              </Button>
            </>
          )}
          {sop.status === 'APPROVED' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/settings/sops/${sop.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t('sop.actions.createNewVersion')}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* SOP Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Left Column */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sop.detailPage.sopInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('sop.table.title')}</div>
              <div className="font-medium">{sop.title}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('sop.table.category')}</div>
              <Badge variant="outline">{t(`sop.category.${sop.category}`)}</Badge>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('sop.table.status')}</div>
              <Badge className={STATUS_COLORS[sop.status]}>{t(`sop.status.${sop.status}`)}</Badge>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">{t('sop.detailPage.version')}</div>
              <div className="font-medium">{sop.versionNumber}</div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sop.detailPage.metadata')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('sop.detailPage.createdBy')}</div>
                <div className="font-medium">{sop.createdBy.name}</div>
                <div className="text-sm text-gray-500">
                  {format(new Date(sop.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>

            {sop.approvedBy && sop.approvedAt && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">{t('sop.detailPage.approvedBy')}</div>
                  <div className="font-medium">{sop.approvedBy.name}</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(sop.approvedAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('sop.detailPage.acknowledgments')}</div>
                <div className="font-medium">{sop.acknowledgments?.length || 0} {t('sop.detailPage.staffMembers')}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">{t('sop.detailPage.lastUpdated')}</div>
                <div className="text-sm">
                  {format(new Date(sop.updatedAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOP Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sop.detailPage.sopContent')}</CardTitle>
          <CardDescription>{t('sop.detailPage.contentDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor content={sop.content} onChange={() => {}} editable={false} />
        </CardContent>
      </Card>

      {/* Staff Acknowledgments */}
      {sop.acknowledgments && sop.acknowledgments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sop.detailPage.staffAcknowledgments')}</CardTitle>
            <CardDescription>
              {t('sop.detailPage.staffAcknowledgmentsDescription', {
                count: sop.acknowledgments.length
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sop.acknowledgments.map((ack) => (
                <div
                  key={ack.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <div className="font-medium">{ack.user.name}</div>
                      <div className="text-sm text-gray-500">{ack.user.email}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {t('sop.detailPage.acknowledgedOn')} {format(new Date(ack.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      {versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sop.detailPage.versionHistory')}</CardTitle>
            <CardDescription>{t('sop.detailPage.versionHistoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versionHistory.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/${locale}/settings/sops/${version.id}`)}
                >
                  <div>
                    <div className="font-medium">{t('sop.detailPage.version')} {version.versionNumber}</div>
                    <div className="text-sm text-gray-500">
                      {version.createdBy.name} •{' '}
                      {format(new Date(version.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={version.status === 'ARCHIVED' ? 'bg-gray-100' : ''}
                  >
                    {t(`sop.status.${version.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sop.detailPage.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sop.detailPage.deleteConfirmMessage', {
                code: sop.code,
                title: sop.title
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sop.createPage.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('sop.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
