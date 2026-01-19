/**
 * Activity Log Page
 *
 * Full activity timeline with filtering and pagination
 * Route: /activity
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, FileText, Package, ClipboardCheck, Euro, File, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ActivityList } from '@/components/activity/ActivityList';
import { getActivityLog } from '@/lib/services/activity-service';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN ACTIVITY PAGE
// ============================================================================

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string };
}) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Get translations
  const t = await getTranslations();

  // Parse search params
  const type = searchParams.type || 'all';
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 20;

  // Fetch activity log
  const { activities, total } = await getActivityLog({
    type: type === 'all' ? undefined : type,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('activity.backToDashboard')}
              </Link>
            </Button>
          </div>
          <h1 className="text-sm font-bold tracking-tight">{t('activity.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('activity.subtitle')}</p>
        </div>
        <Activity className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activity.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {t('activity.filterByType')}
              </label>
              <Select defaultValue={type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('activity.allTypes')}</SelectItem>
                  <SelectItem value="ORDER">{t('dashboardWidgets.activityTypeOrder')}</SelectItem>
                  <SelectItem value="WORKSHEET">
                    {t('dashboardWidgets.activityTypeWorksheet')}
                  </SelectItem>
                  <SelectItem value="MATERIAL">
                    {t('dashboardWidgets.activityTypeMaterial')}
                  </SelectItem>
                  <SelectItem value="QC">{t('dashboardWidgets.activityTypeQc')}</SelectItem>
                  <SelectItem value="INVOICE">
                    {t('dashboardWidgets.activityTypeInvoice')}
                  </SelectItem>
                  <SelectItem value="DOCUMENT">
                    {t('dashboardWidgets.activityTypeDocument')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('activity.activityLog')}</CardTitle>
              <CardDescription>
                {t('activity.showingResults', {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, total),
                  total,
                })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivityList activities={activities} />
          </Suspense>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                {t('activity.page', { current: page, total: totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  asChild={page > 1}
                >
                  {page > 1 ? (
                    <Link href={`/activity?type=${type}&page=${page - 1}`}>
                      {t('activity.previous')}
                    </Link>
                  ) : (
                    <span>{t('activity.previous')}</span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  asChild={page < totalPages}
                >
                  {page < totalPages ? (
                    <Link href={`/activity?type=${type}&page=${page + 1}`}>
                      {t('activity.next')}
                    </Link>
                  ) : (
                    <span>{t('activity.next')}</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
