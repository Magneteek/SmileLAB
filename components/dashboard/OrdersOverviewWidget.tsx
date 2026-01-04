'use client';

/**
 * Orders Overview Widget
 *
 * Displays order statistics with status breakdown
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrdersOverview } from '@/lib/services/dashboard-service';
import { FileText, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface OrdersOverviewWidgetProps {
  data: OrdersOverview;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-500',
  inProduction: 'bg-blue-500',
  qcPending: 'bg-yellow-500',
  qcApproved: 'bg-green-500',
  invoiced: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};

export function OrdersOverviewWidget({ data }: OrdersOverviewWidgetProps) {
  const t = useTranslations('dashboardWidgets');
  const activeOrders = data.pending + data.inProduction + data.qcPending;
  const completedOrders = data.delivered;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('ordersOverviewTitle')}</CardTitle>
            <CardDescription>{t('ordersOverviewDescription')}</CardDescription>
          </div>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('totalOrders')}</p>
            <p className="text-2xl font-bold">{data.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('active')}</p>
            <p className="text-2xl font-bold text-blue-600">{activeOrders}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('completed')}</p>
            <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-3">{t('statusBreakdown')}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.pending} variant="default">{t('statusPENDING')}</Badge>
            </div>
            <span className="font-semibold">{data.pending}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.inProduction} variant="default">{t('statusIN_PRODUCTION')}</Badge>
            </div>
            <span className="font-semibold">{data.inProduction}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.qcPending} variant="default">{t('statusQC_PENDING')}</Badge>
            </div>
            <span className="font-semibold">{data.qcPending}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.qcApproved} variant="default">{t('statusQC_APPROVED')}</Badge>
            </div>
            <span className="font-semibold">{data.qcApproved}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.invoiced} variant="default">{t('statusINVOICED')}</Badge>
            </div>
            <span className="font-semibold">{data.invoiced}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={statusColors.delivered} variant="default">{t('statusDELIVERED')}</Badge>
            </div>
            <span className="font-semibold">{data.delivered}</span>
          </div>

          {data.cancelled > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={statusColors.cancelled} variant="default">{t('statusCANCELLED')}</Badge>
              </div>
              <span className="font-semibold">{data.cancelled}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
