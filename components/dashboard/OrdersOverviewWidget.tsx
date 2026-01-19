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
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('ordersOverviewTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('ordersOverviewDescription')}</CardDescription>
          </div>
          <FileText className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-1">
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('totalOrders')}</p>
            <p className="text-sm font-bold">{data.total}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('active')}</p>
            <p className="text-sm font-bold text-blue-600">{activeOrders}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('completed')}</p>
            <p className="text-sm font-bold text-green-600">{completedOrders}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-0.5 pt-1">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{t('statusBreakdown')}</p>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.pending} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusPENDING')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.pending}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.inProduction} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusIN_PRODUCTION')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.inProduction}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.qcPending} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusQC_PENDING')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.qcPending}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.qcApproved} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusQC_APPROVED')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.qcApproved}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.invoiced} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusINVOICED')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.invoiced}</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1">
              <Badge className={`${statusColors.delivered} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusDELIVERED')}</Badge>
            </div>
            <span className="text-xs font-semibold">{data.delivered}</span>
          </div>

          {data.cancelled > 0 && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1">
                <Badge className={`${statusColors.cancelled} text-[10px] py-0 px-1.5 h-4`} variant="default">{t('statusCANCELLED')}</Badge>
              </div>
              <span className="text-xs font-semibold">{data.cancelled}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
