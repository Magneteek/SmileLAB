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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('materialInventoryTitle')}</CardTitle>
            <CardDescription>{t('materialInventoryDescription')}</CardDescription>
          </div>
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('totalMaterials')}</p>
            <p className="text-2xl font-bold">{data.totalMaterials}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('active')}</p>
            <p className="text-2xl font-bold text-green-600">{data.activeMaterials}</p>
          </div>
        </div>

        {/* Alerts */}
        {hasAlerts ? (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('alertsWarnings')}</p>

            {data.expired > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="font-medium">{t('lotsExpired', { count: data.expired })}</span>
                  <Link href="/materials">
                    <Button variant="destructive" size="sm">{t('viewButton')}</Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {data.lowStock > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-900">
                    {t('lotsOutOfStock', { count: data.lowStock })}
                  </span>
                </div>
                <Badge variant="destructive">{data.lowStock}</Badge>
              </div>
            )}

            {data.reorderNeeded > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">
                    {t('lotsBelowReorder', { count: data.reorderNeeded })}
                  </span>
                </div>
                <Badge className="bg-orange-500">{data.reorderNeeded}</Badge>
              </div>
            )}

            {data.expiringSoon > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">
                    {t('lotsExpiringSoon', { count: data.expiringSoon })}
                  </span>
                </div>
                <Badge className="bg-yellow-500">{data.expiringSoon}</Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t pt-4">
            <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                {t('allMaterialsGood')}
              </p>
            </div>
          </div>
        )}

        {/* Quick Action */}
        <div className="border-t pt-4">
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
