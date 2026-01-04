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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorksheetStatusBadge } from '@/src/components/worksheets/WorksheetStatusBadge';
import { Plus, FileText, Eye, Edit } from 'lucide-react';
import type { WorksheetStatus } from '@/src/types/worksheet';

// ============================================================================
// TYPES
// ============================================================================

interface SearchParams {
  page?: string;
  status?: WorksheetStatus;
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
  const status = params.status;
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('worksheet.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('worksheet.subtitle')}
          </p>
        </div>
        <Link href="/worksheets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('worksheet.newWorksheet')}
          </Button>
        </Link>
      </div>

      {/* Filters - Compact Single Row */}
      <Card>
        <CardContent className="py-3">
          <form method="get" action="/worksheets" className="flex items-center gap-3" suppressHydrationWarning>
            {/* Search */}
            <input
              type="text"
              id="search"
              name="search"
              placeholder={t('order.searchPlaceholder')}
              defaultValue={search}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />

            {/* Status Filter */}
            <select
              id="status"
              name="status"
              defaultValue={status || ''}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            >
              <option value="">{t('order.allStatuses')}</option>
              <option value="DRAFT">{t('status.draft')}</option>
              <option value="IN_PRODUCTION">{t('status.in_production')}</option>
              <option value="QC_PENDING">{t('status.qc_pending')}</option>
              <option value="QC_APPROVED">{t('status.qc_approved')}</option>
              <option value="QC_REJECTED">{t('status.qc_rejected')}</option>
              <option value="DELIVERED">{t('status.delivered')}</option>
              <option value="CANCELLED">{t('status.cancelled')}</option>
            </select>

            {/* Apply Filters Button */}
            <Button type="submit" className="whitespace-nowrap" suppressHydrationWarning>
              {t('worksheet.applyFilters')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Worksheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('worksheet.worksheetsCount', { total: pagination.total })}</CardTitle>
          <CardDescription>
            {t('worksheet.showing', { count: worksheets.length, total: pagination.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('worksheet.tableActions')}</TableHead>
                  <TableHead>{t('worksheet.tableWorksheetNumber')}</TableHead>
                  <TableHead>{t('worksheet.tableDentist')}</TableHead>
                  <TableHead>{t('worksheet.tablePatient')}</TableHead>
                  <TableHead>{t('worksheet.tableProducts')}</TableHead>
                  <TableHead>{t('worksheet.tableMaterials')}</TableHead>
                  <TableHead>{t('worksheet.tableStatus')}</TableHead>
                  <TableHead>{t('worksheet.tableCreated')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worksheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('worksheet.noWorksheets')}</p>
                      <p className="text-sm mt-1">{t('worksheet.noWorksheetsDesc')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  worksheets.map((worksheet: any) => (
                    <TableRow key={worksheet.id}>
                      <TableCell>
                        <Link href={`/worksheets/${worksheet.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/worksheets/${worksheet.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {worksheet.worksheetNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{worksheet.dentistName}</span>
                          <span className="text-sm text-gray-600">{worksheet.clinicName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{worksheet.patientName || '—'}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate" title={worksheet.productNames}>
                          {worksheet.productNames || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {worksheet.materialsWithLots && worksheet.materialsWithLots.length > 0 ? (
                          <div className="text-sm space-y-0.5">
                            {worksheet.materialsWithLots.slice(0, 2).map((mat: any, idx: number) => (
                              <div key={idx} className="truncate" title={`${mat.materialName}${mat.lotNumber ? ` - ${t('worksheet.lotLabel')}: ${mat.lotNumber}` : ''}`}>
                                {mat.materialName}
                                {mat.lotNumber && (
                                  <span className="text-xs text-gray-600 ml-1">
                                    ({t('worksheet.lotLabel')}: {mat.lotNumber})
                                  </span>
                                )}
                              </div>
                            ))}
                            {worksheet.materialsWithLots.length > 2 && (
                              <p className="text-xs text-gray-500">
                                {t('worksheet.moreCount', { count: worksheet.materialsWithLots.length - 2 })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <WorksheetStatusBadge status={worksheet.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        {new Date(worksheet.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
