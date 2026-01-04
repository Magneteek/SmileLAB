'use client';

/**
 * DentistsTable Component
 *
 * Displays dentists/clinics in a sortable, filterable table.
 * Features: Click to view/edit, active/inactive badges, actions dropdown.
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Dentist } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  ArrowUpDown,
} from 'lucide-react';

interface DentistsTableProps {
  dentists: Dentist[];
  onSort?: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onDelete?: (id: string) => void;
}

export function DentistsTable({
  dentists,
  onSort,
  sortBy,
  sortOrder,
  onDelete,
}: DentistsTableProps) {
  const t = useTranslations();

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('clinicName')}
                className="flex items-center"
              >
                {t('dentist.tableHeaderClinicName')}
                {getSortIcon('clinicName')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('dentistName')}
                className="flex items-center"
              >
                {t('dentist.tableHeaderDentist')}
                {getSortIcon('dentistName')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('city')}
                className="flex items-center"
              >
                {t('dentist.tableHeaderCity')}
                {getSortIcon('city')}
              </Button>
            </TableHead>
            <TableHead>{t('dentist.tableHeaderContact')}</TableHead>
            <TableHead>{t('dentist.tableHeaderPaymentTerms')}</TableHead>
            <TableHead>{t('dentist.tableHeaderStatus')}</TableHead>
            <TableHead className="text-right">{t('dentist.tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!dentists || dentists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                {t('dentist.tableEmpty')}
              </TableCell>
            </TableRow>
          ) : (
            dentists.map((dentist) => (
              <TableRow
                key={dentist.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => window.location.href = `/dentists/${dentist.id}`}
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/dentists/${dentist.id}`}
                    className="hover:underline"
                  >
                    {dentist.clinicName}
                  </Link>
                </TableCell>
                <TableCell>{dentist.dentistName}</TableCell>
                <TableCell>{dentist.city}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Mail className="h-3 w-3" />
                      <a
                        href={`mailto:${dentist.email}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {dentist.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`tel:${dentist.phone}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {dentist.phone}
                      </a>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {t('dentist.tablePaymentTermsDays', { days: dentist.paymentTerms })}
                  </span>
                </TableCell>
                <TableCell>
                  {dentist.active ? (
                    <Badge variant="default" className="bg-green-600">
                      {t('dentist.tableStatusActive')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t('dentist.tableStatusInactive')}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t('dentist.dropdownOpenMenu')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('dentist.dropdownActionsLabel')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/dentists/${dentist.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('dentist.dropdownViewDetails')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dentists/${dentist.id}?edit=true`}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('dentist.dropdownEdit')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDelete) {
                            onDelete(dentist.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('dentist.dropdownDelete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
