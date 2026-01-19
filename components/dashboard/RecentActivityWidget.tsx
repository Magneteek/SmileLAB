'use client';

/**
 * Recent Activity Widget
 *
 * Displays timeline of recent system activities
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecentActivity } from '@/lib/services/dashboard-service';
import { Activity, FileText, Package, ClipboardCheck, Euro, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sl } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';

interface RecentActivityWidgetProps {
  data: RecentActivity[];
}

const activityIcons: Record<RecentActivity['type'], React.ComponentType<{ className?: string }>> = {
  ORDER: FileText,
  WORKSHEET: ClipboardCheck,
  MATERIAL: Package,
  QC: ClipboardCheck,
  INVOICE: Euro,
  DOCUMENT: File,
};

const activityColors: Record<RecentActivity['type'], string> = {
  ORDER: 'bg-blue-500',
  WORKSHEET: 'bg-purple-500',
  MATERIAL: 'bg-green-500',
  QC: 'bg-yellow-500',
  INVOICE: 'bg-indigo-500',
  DOCUMENT: 'bg-gray-500',
};

export function RecentActivityWidget({ data }: RecentActivityWidgetProps) {
  const t = useTranslations('dashboardWidgets');
  const locale = useLocale();
  const dateLocale = locale === 'sl' ? sl : undefined;

  return (
    <Card>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between py-0.5">
          <div>
            <CardTitle className="text-xs font-semibold">{t('recentActivityTitle')}</CardTitle>
            <CardDescription className="text-[10px]">{t('recentActivityDescription')}</CardDescription>
          </div>
          <Activity className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1">
        {data.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] text-muted-foreground">{t('noRecentActivity')}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {data.slice(0, 4).map((activity, index) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];

              return (
                <div
                  key={`${activity.id}-${index}`}
                  className="flex items-start gap-1 p-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 ${colorClass} rounded-full flex items-center justify-center`}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-medium truncate">
                        {activity.description}
                      </p>
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {t(`activityType${activity.type.charAt(0) + activity.type.slice(1).toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {t('byUser', { userName: activity.userName })}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Link */}
        {data.length > 0 && (
          <div className="mt-4 pt-1 border-t">
            <a href="/activity" className="text-sm text-blue-600 hover:underline w-full text-center block">
              {t('viewAllActivity')}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
