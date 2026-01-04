'use client';

/**
 * OrdersTable Component
 *
 * Data table for displaying orders with sorting, filtering, and actions
 */

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { OrderWithRelations } from '@/types/order';
import type { OrderStatus } from '@prisma/client';
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
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';

interface OrdersTableProps {
  orders: OrderWithRelations[];
  onDelete?: (orderId: string) => void;
}

// Status badge colors
const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-gray-500',
  IN_PRODUCTION: 'bg-blue-500',
  QC_PENDING: 'bg-yellow-500',
  QC_APPROVED: 'bg-green-500',
  INVOICED: 'bg-purple-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

// Status translation key mapping
const statusKeys: Record<OrderStatus, string> = {
  PENDING: 'status.pending',
  IN_PRODUCTION: 'status.in_production',
  QC_PENDING: 'status.qc_pending',
  QC_APPROVED: 'status.qc_approved',
  INVOICED: 'status.invoiced',
  DELIVERED: 'status.delivered',
  CANCELLED: 'status.cancelled',
};

// Priority colors
const priorityColors = ['text-gray-600', 'text-orange-600', 'text-red-600'];

// Format date
function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function OrdersTable({ orders, onDelete }: OrdersTableProps) {
  const t = useTranslations();
  const [sortBy, setSortBy] = useState<'orderNumber' | 'orderDate' | 'dueDate'>(
    'orderDate'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (
    field: 'orderNumber' | 'orderDate' | 'dueDate'
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    if (sortBy === 'orderNumber') {
      aValue = a.orderNumber;
      bValue = b.orderNumber;
    } else if (sortBy === 'orderDate') {
      aValue = new Date(a.orderDate).getTime();
      bValue = new Date(b.orderDate).getTime();
    } else {
      aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('orderNumber')}
            >
              {t('order.tableOrderNumber')}
              {sortBy === 'orderNumber' && (
                <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead>{t('order.tableDentist')}</TableHead>
            <TableHead>{t('order.tablePatient')}</TableHead>
            <TableHead>{t('order.tableStatus')}</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('orderDate')}
            >
              {t('order.tableOrderDate')}
              {sortBy === 'orderDate' && (
                <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('dueDate')}
            >
              {t('order.tableDueDate')}
              {sortBy === 'dueDate' && (
                <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead>{t('order.tableWorksheet')}</TableHead>
            <TableHead className="text-right">{t('order.tableActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                {t('order.tableNoOrders')}
              </TableCell>
            </TableRow>
          ) : (
            sortedOrders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => window.location.href = `/orders/${order.id}`}
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/orders/${order.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dentists/${order.dentist.id}`}>
                    <div className="hover:underline">
                      <div className="font-medium">
                        {order.dentist.clinicName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.dentist.dentistName}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  {order.patientName || ((order as any).worksheets?.[0]?.patientName) ? (
                    <div className="font-medium">
                      {order.patientName || (order as any).worksheets?.[0]?.patientName}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={statusColors[order.status]}
                    variant="default"
                  >
                    {t(statusKeys[order.status])}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {order.dueDate ? (
                      <span
                        className={
                          new Date(order.dueDate) < new Date()
                            ? 'text-red-600 font-semibold'
                            : ''
                        }
                      >
                        {formatDate(order.dueDate)}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                    <Badge
                      variant="outline"
                      className={`w-fit ${priorityColors[order.priority]}`}
                    >
                      {order.priority === 0 && t('order.priorityNormal')}
                      {order.priority === 1 && t('order.priorityHigh')}
                      {order.priority === 2 && t('order.priorityUrgent')}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(order as any).worksheets?.[0] ? (
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/worksheets/${(order as any).worksheets[0].id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {(order as any).worksheets[0].worksheetNumber}
                        {(order as any).worksheets[0].revision > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {t('order.tableRevision')} {(order as any).worksheets[0].revision}
                          </span>
                        )}
                      </Link>
                      <Badge
                        variant="outline"
                        className="w-fit text-xs"
                      >
                        {(order as any).worksheets[0].status}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('order.tableActions')}</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/orders/${order.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('order.actionViewDetails')}
                        </Link>
                      </DropdownMenuItem>
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(order.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('order.actionDeleteOrder')}
                          </DropdownMenuItem>
                        </>
                      )}
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
