'use client';

/**
 * Material Alerts Widget
 *
 * Displays material inventory alerts and warnings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaterialAlerts } from '@/lib/services/dashboard-service';
import { Package, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface MaterialAlertsWidgetProps {
  data: MaterialAlerts;
}

export function MaterialAlertsWidget({ data }: MaterialAlertsWidgetProps) {
  const t = useTranslations('dashboardWidgets');
  const hasAlerts = data.lowStock > 0 || data.expiringSoon > 0 || data.expired > 0 || data.reorderNeeded > 0;

  return (
    <Card>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('materialInventoryTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('materialInventoryDescription')}</CardDescription>
          </div>
          <Package className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-1">
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('totalMaterials')}</p>
            <p className="text-sm font-bold">{data.totalMaterials}</p>
          </div>
          <div className="space-y-0">
            <p className="text-[10px] text-muted-foreground">{t('active')}</p>
            <p className="text-sm font-bold text-green-600">{data.activeMaterials}</p>
          </div>
        </div>

        {/* Alerts */}
        {hasAlerts ? (
          <div className="space-y-0.5 border-t pt-1">
            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{t('alertsWarnings')}</p>

            {data.expired > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="flex items-center justify-between py-0.5">
                  <span className="font-medium">{t('lotsExpired', { count: data.expired })}</span>
                  <Link href="/materials">
                    <Button variant="destructive" size="sm">{t('viewButton')}</Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {data.lowStock > 0 && (
              <div className="flex items-center justify-between p-1 border rounded-lg bg-red-50">
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span className="text-[10px] font-medium text-red-900">
                    {t('lotsOutOfStock', { count: data.lowStock })}
                  </span>
                </div>
                <Badge variant="destructive">{data.lowStock}</Badge>
              </div>
            )}

            {data.reorderNeeded > 0 && (
              <div className="flex items-center justify-between p-1 border rounded-lg bg-orange-50">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  <span className="text-[10px] font-medium text-orange-900">
                    {t('lotsBelowReorder', { count: data.reorderNeeded })}
                  </span>
                </div>
                <Badge className="bg-orange-500">{data.reorderNeeded}</Badge>
              </div>
            )}

            {data.expiringSoon > 0 && (
              <div className="flex items-center justify-between p-1 border rounded-lg bg-yellow-50">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  <span className="text-[10px] font-medium text-yellow-900">
                    {t('lotsExpiringSoon', { count: data.expiringSoon })}
                  </span>
                </div>
                <Badge className="bg-yellow-500">{data.expiringSoon}</Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t pt-1">
            <div className="flex items-center justify-center p-2 bg-green-50 rounded-lg">
              <p className="text-[10px] font-medium text-green-900">
                {t('allMaterialsGood')}
              </p>
            </div>
          </div>
        )}

        {/* Quick Action */}
        <div className="border-t pt-1">
          <Link href="/materials">
            <Button variant="outline" className="w-full">
              {t('viewAllMaterials')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
