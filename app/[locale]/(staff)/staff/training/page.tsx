'use client';

/**
 * Staff Training History
 *
 * View all acknowledged SOPs and training records
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Calendar, Eye, CheckCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  versionNumber: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export default function StaffTrainingPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('staff');
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOPs, setSelectedSOPs] = useState<Set<string>>(new Set());
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      const response = await fetch('/api/staff/sops');
      if (response.ok) {
        const data = await response.json();
        setSOPs(data);
      }
    } catch (error) {
      console.error('Failed to fetch SOPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgedSOPs = sops.filter((sop) => sop.acknowledged);
  const pendingSOPs = sops.filter((sop) => !sop.acknowledged);

  const toggleSelection = (sopId: string) => {
    const newSelection = new Set(selectedSOPs);
    if (newSelection.has(sopId)) {
      newSelection.delete(sopId);
    } else {
      newSelection.add(sopId);
    }
    setSelectedSOPs(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedSOPs.size === pendingSOPs.length) {
      setSelectedSOPs(new Set());
    } else {
      setSelectedSOPs(new Set(pendingSOPs.map((sop) => sop.id)));
    }
  };

  const handleBulkAcknowledge = async () => {
    if (selectedSOPs.size === 0) return;

    setBulkAcknowledging(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/staff/sops/bulk-acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sopIds: Array.from(selectedSOPs) }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          t('bulkAcknowledgeSuccess', {
            count: data.acknowledged,
            skipped: data.skipped,
          })
        );
        setSelectedSOPs(new Set());
        // Refresh SOPs list
        await fetchSOPs();
      } else {
        setError(data.error || t('bulkAcknowledgeError'));
      }
    } catch (err) {
      console.error('Bulk acknowledge error:', err);
      setError(t('bulkAcknowledgeError'));
    } finally {
      setBulkAcknowledging(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div>
        <h1 className="text-sm font-bold text-gray-900">{t('myTraining')}</h1>
        <p className="text-gray-500 mt-1">
          {t('trainingHistoryDescription')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('completed')}</p>
                <p className="text-sm font-bold text-green-600">{acknowledgedSOPs.length}</p>
                <p className="text-xs text-gray-500 mt-1">{t('sopsAcknowledged')}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('pending')}</p>
                <p className="text-sm font-bold text-orange-600">{pendingSOPs.length}</p>
                <p className="text-xs text-gray-500 mt-1">{t('sopsToAcknowledge')}</p>
              </div>
              <Calendar className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Acknowledgments */}
      {pendingSOPs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('pendingAcknowledgments')}</CardTitle>
                <CardDescription>
                  {t('sopsRequireAcknowledgment')}
                </CardDescription>
              </div>
              {pendingSOPs.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedSOPs.size === pendingSOPs.length && pendingSOPs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      {t('selectAll')}
                    </label>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleBulkAcknowledge}
                    disabled={selectedSOPs.size === 0 || bulkAcknowledging}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {bulkAcknowledging
                      ? t('acknowledging')
                      : t('acknowledgeSelected', { count: selectedSOPs.size })}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSOPs.map((sop) => (
                <div
                  key={sop.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedSOPs.has(sop.id)}
                    onCheckedChange={() => toggleSelection(sop.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{sop.code} - {sop.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      <Badge variant="outline" className="mr-2">{sop.category}</Badge>
                      {t('version')} {sop.versionNumber}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/${locale}/staff/sops/${sop.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('view')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Training */}
      <Card>
        <CardHeader>
          <CardTitle>{t('completedTraining')}</CardTitle>
          <CardDescription>
            {t('sopsYouAcknowledged')} ({acknowledgedSOPs.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('loading')}</div>
          ) : acknowledgedSOPs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noSOPsAcknowledged')}
            </div>
          ) : (
            <div className="space-y-3">
              {acknowledgedSOPs.map((sop) => (
                <div
                  key={sop.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                      <div className="font-medium">{sop.code} - {sop.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Badge variant="outline" className="mr-2">{sop.category}</Badge>
                        {t('version')} {sop.versionNumber}
                      </div>
                      {sop.acknowledgedAt && (
                        <div className="text-xs text-gray-400 mt-2">
                          {t('acknowledgedOn')} {format(new Date(sop.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/${locale}/staff/sops/${sop.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
