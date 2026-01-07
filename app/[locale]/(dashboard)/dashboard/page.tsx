/**
 * Main Dashboard Page
 *
 * Role-aware dashboard with 6 widget areas:
 * - Orders Overview
 * - Material Alerts
 * - QC Status
 * - Invoices (ADMIN only)
 * - MDR Documents
 * - Recent Activity
 *
 * Route: /
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { getDashboardStats } from '@/lib/services/dashboard-service';
import { OrdersOverviewWidget } from '@/components/dashboard/OrdersOverviewWidget';
import { MaterialAlertsWidget } from '@/components/dashboard/MaterialAlertsWidget';
import { QCStatusWidget } from '@/components/dashboard/QCStatusWidget';
import { InvoicesWidget } from '@/components/dashboard/InvoicesWidget';
import { DocumentsWidget } from '@/components/dashboard/DocumentsWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, FileText, Package, Receipt } from 'lucide-react';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default async function DashboardPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Get translations
  const t = await getTranslations();

  // Fetch dashboard statistics
  const stats = await getDashboardStats(session.user.role);

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.welcomeBack', { name: session.user.name })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default" size="sm">
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.createOrder')}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/worksheets/new">
            <FileText className="mr-2 h-4 w-4" />
            {t('dashboard.createWorksheet')}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/materials">
            <Package className="mr-2 h-4 w-4" />
            {t('dashboard.manageMaterials')}
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <Receipt className="mr-2 h-4 w-4" />
              {t('dashboard.viewInvoices')}
            </Link>
          </Button>
        )}
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Orders Overview */}
        <Suspense fallback={<WidgetSkeleton />}>
          <OrdersOverviewWidget data={stats.orders} />
        </Suspense>

        {/* Material Alerts */}
        <Suspense fallback={<WidgetSkeleton />}>
          <MaterialAlertsWidget data={stats.materials} />
        </Suspense>

        {/* QC Status */}
        <Suspense fallback={<WidgetSkeleton />}>
          <QCStatusWidget data={stats.qc} />
        </Suspense>

        {/* Invoices (ADMIN only) */}
        {isAdmin && stats.invoices && (
          <Suspense fallback={<WidgetSkeleton />}>
            <InvoicesWidget data={stats.invoices} />
          </Suspense>
        )}

        {/* MDR Documents */}
        <Suspense fallback={<WidgetSkeleton />}>
          <DocumentsWidget data={stats.documents} />
        </Suspense>

        {/* Recent Activity */}
        <Suspense fallback={<WidgetSkeleton />}>
          <RecentActivityWidget data={stats.recentActivity} />
        </Suspense>
      </div>
    </div>
  );
}
