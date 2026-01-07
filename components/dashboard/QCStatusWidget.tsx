'use client';

/**
 * QC Status Widget
 *
 * Displays quality control statistics and pending inspections
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QCStatusOverview } from '@/lib/services/dashboard-service';
import { ClipboardCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QCStatusWidgetProps {
  data: QCStatusOverview;
}

export function QCStatusWidget({ data }: QCStatusWidgetProps) {
  const t = useTranslations('dashboardWidgets');
  const passRate =
    data.totalInspections > 0
      ? ((data.passedInspections / data.totalInspections) * 100).toFixed(1)
      : '0.0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('qualityControlTitle')}</CardTitle>
            <CardDescription>{t('qualityControlDescription')}</CardDescription>
          </div>
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('totalInspections')}</p>
            <p className="text-2xl font-bold">{data.totalInspections}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('passRate')}</p>
            <p className="text-2xl font-bold text-green-600">{passRate}%</p>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">{t('todayInspections')}</p>
            <Badge variant="outline">{data.todayInspections}</Badge>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">{t('statusBreakdown')}</p>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">{t('pending')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500">{data.pendingInspections}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{t('passed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">{data.passedInspections}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">{t('failed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{data.failedInspections}</Badge>
            </div>
          </div>
        </div>

        {/* Alert for Pending */}
        {data.pendingInspections > 0 && (
          <div className="border-t pt-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                {t('inspectionsAwaitingReview', { count: data.pendingInspections })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
