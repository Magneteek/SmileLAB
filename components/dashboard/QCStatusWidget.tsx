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
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('qualityControlTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('qualityControlDescription')}</CardDescription>
          </div>
          <ClipboardCheck className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-1">
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('totalInspections')}</p>
            <p className="text-sm font-bold">{data.totalInspections}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('passRate')}</p>
            <p className="text-sm font-bold text-green-600">{passRate}%</p>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="border-t pt-1">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">{t('todayInspections')}</p>
            <Badge variant="outline">{data.todayInspections}</Badge>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-0.5 border-t pt-1">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{t('statusBreakdown')}</p>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-600" />
              <span className="text-[10px] font-medium">{t('pending')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-yellow-500">{data.pendingInspections}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-medium">{t('passed')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-green-500">{data.passedInspections}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-1 border rounded-lg">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-[10px] font-medium">{t('failed')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="destructive">{data.failedInspections}</Badge>
            </div>
          </div>
        </div>

        {/* Alert for Pending */}
        {data.pendingInspections > 0 && (
          <div className="border-t pt-1">
            <div className="p-1 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-[10px] font-medium text-yellow-900">
                {t('inspectionsAwaitingReview', { count: data.pendingInspections })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
