/**
 * Worksheets List Page
 *
 * Displays all worksheets with filtering, search, and pagination.
 * Shows worksheet status, dentist info, creation date, and actions.
 *
 * Features:
 * - Data table with sortable columns
 * - Status filtering
 * - Search by worksheet number, dentist, patient
 * - Pagination
 * - Quick actions (view, edit, transition)
 * - Status badges
 * - Responsive design
 *
 * Route: /worksheets
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWorksheets } from '@/src/lib/services/worksheet-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorksheetsTable } from '@/components/worksheets/WorksheetsTable';
import { WorksheetFilters } from '@/components/worksheets/WorksheetFilters';
import { Plus } from 'lucide-react';
import type { WorksheetStatus } from '@/src/types/worksheet';

// ============================================================================
// TYPES
// ============================================================================

interface SearchParams {
  page?: string;
  status?: WorksheetStatus | 'ALL';
  search?: string;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function WorksheetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Translations
  const t = await getTranslations();

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Await search params
  const params = await searchParams;

  // Parse query parameters
  const page = parseInt(params.page || '1', 10);
  const status = params.status && params.status !== 'ALL' ? params.status : undefined;
  const search = params.search;

  // Fetch worksheets
  const result = await getWorksheets(
    {
      status,
      search,
    },
    {
      page,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
  );

  const { data: worksheets, pagination } = result;

  return (
    <div className="w-full max-w-full py-6 space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t('worksheet.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('worksheet.subtitle')}
          </p>
        </div>
        <Link href="/worksheets/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('worksheet.newWorksheet')}
          </Button>
        </Link>
      </div>

      {/* Filters - Mobile drawer, desktop inline */}
      <WorksheetFilters search={search} status={status} />

      {/* Worksheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('worksheet.worksheetsCount', { total: pagination.total })}</CardTitle>
          <CardDescription>
            {t('worksheet.showing', { count: worksheets.length, total: pagination.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorksheetsTable worksheets={worksheets} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                {t('worksheet.pageOf', { page: pagination.page, total: pagination.totalPages })}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/worksheets?page=${Math.max(1, page - 1)}${
                    status ? `&status=${status}` : ''
                  }${search ? `&search=${search}` : ''}`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                  >
                    {t('order.previous')}
                  </Button>
                </Link>
                <Link
                  href={`/worksheets?page=${Math.min(
                    pagination.totalPages,
                    page + 1
                  )}${status ? `&status=${status}` : ''}${
                    search ? `&search=${search}` : ''
                  }`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                  >
                    {t('order.next')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
