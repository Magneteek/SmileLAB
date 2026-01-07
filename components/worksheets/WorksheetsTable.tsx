'use client';

/**
 * Worksheets Table Component
 *
 * Data table for displaying worksheets with sorting functionality
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { WorksheetStatusBadge } from '@/src/components/worksheets/WorksheetStatusBadge';
import { FileText, Eye } from 'lucide-react';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface WorksheetsTableProps {
  worksheets: any[];
}

export function WorksheetsTable({ worksheets }: WorksheetsTableProps) {
  const t = useTranslations();

  const { sortedData: sortedWorksheets, sortKey, sortDirection, handleSort } = useTableSort({
    data: worksheets,
    initialSortKey: 'createdAt',
    initialSortDirection: 'desc',
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('worksheet.tableActions')}</TableHead>
            <SortableTableHeader
              sortKey="worksheetNumber"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            >
              {t('worksheet.tableWorksheetNumber')}
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="dentistName"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            >
              {t('worksheet.tableDentist')}
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="patientName"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            >
              {t('worksheet.tablePatient')}
            </SortableTableHeader>
            <TableHead>{t('worksheet.tableProducts')}</TableHead>
            <TableHead>{t('worksheet.tableMaterials')}</TableHead>
            <SortableTableHeader
              sortKey="status"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            >
              {t('worksheet.tableStatus')}
            </SortableTableHeader>
            <SortableTableHeader
              sortKey="createdAt"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            >
              {t('worksheet.tableCreated')}
            </SortableTableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedWorksheets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('worksheet.noWorksheets')}</p>
                <p className="text-sm mt-1">{t('worksheet.noWorksheetsDesc')}</p>
              </TableCell>
            </TableRow>
          ) : (
            sortedWorksheets.map((worksheet: any) => (
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
  );
}
