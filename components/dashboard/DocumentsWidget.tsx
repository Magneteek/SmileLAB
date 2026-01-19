'use client';

/**
 * Documents Widget
 *
 * Displays MDR compliance document status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentsOverview } from '@/lib/services/dashboard-service';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DocumentsWidgetProps {
  data: DocumentsOverview;
}

export function DocumentsWidget({ data }: DocumentsWidgetProps) {
  const t = useTranslations('dashboardWidgets');

  return (
    <Card>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('mdrDocumentsTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('mdrDocumentsDescription')}</CardDescription>
          </div>
          <FileText className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-1">
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('totalDocuments')}</p>
            <p className="text-sm font-bold">{data.total}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('generated')}</p>
            <p className="text-sm font-bold text-green-600">{data.generated}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-0.5 border-t pt-1">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {t('documentStatus')}
          </p>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-medium">{t('generated')}</span>
            </div>
            <Badge className="bg-green-500">{data.generated}</Badge>
          </div>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-[10px] font-medium">{t('pending')}</span>
            </div>
            <Badge className="bg-blue-500">{data.pending}</Badge>
          </div>

          {data.retentionExpiring > 0 && (
            <div className="flex items-center justify-between p-1 border rounded-lg bg-yellow-50">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                <span className="text-[10px] font-medium text-yellow-900">
                  {t('retentionExpiring')}
                </span>
              </div>
              <Badge className="bg-yellow-500">{data.retentionExpiring}</Badge>
            </div>
          )}
        </div>

        {/* Compliance Info */}
        <div className="border-t pt-1">
          <div className="p-1 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-900">
              {t('documentsRetained10Years')}
            </p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        {data.total === 0 && (
          <div className="border-t pt-1">
            <div className="p-2 bg-gray-50 border rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground">
                {t('noDocumentsGenerated')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('documentsAfterQC')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
