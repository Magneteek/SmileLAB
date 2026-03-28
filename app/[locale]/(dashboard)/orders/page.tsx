'use client';

/**
 * Orders List Page
 *
 * Main page for viewing and filtering orders
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { OrderWithRelations, OrderListResponse } from '@/types/order';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface Dentist {
  id: string;
  clinicName: string;
  dentistName: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const t = useTranslations();

  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'orderNumber' | 'orderDate' | 'dueDate' | 'status'>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [dentistFilter, setDentistFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch dentists
  useEffect(() => {
    async function fetchDentists() {
      try {
        const response = await fetch('/api/dentists?simple=true');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setDentists(result.data);
          }
        }
      } catch (err) {
        console.error('Error fetching dentists:', err);
      }
    }
    fetchDentists();
  }, []);

  // Fetch orders
  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);

        if (searchTerm) params.set('search', searchTerm);
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (dentistFilter !== 'ALL') params.set('dentistId', dentistFilter);
        if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);

        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const result = await response.json();
        if (result.success) {
          const data: OrderListResponse = result.data;
          setOrders(data.orders);
          setTotal(data.total);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(t('order.errorFetchFailed'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [page, limit, sortBy, sortOrder, searchTerm, statusFilter, dentistFilter, priorityFilter]);

  // Handle delete
  async function handleDelete() {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orders/${orderToDelete}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete order');
      }

      // Refresh orders list
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
      setTotal((prev) => prev - 1);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(
        err instanceof Error ? err.message : t('order.errorDeleteFailed')
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSort(key: string) {
    const validKeys = ['orderNumber', 'orderDate', 'dueDate', 'status'] as const;
    if (!validKeys.includes(key as any)) return;
    const k = key as typeof sortBy;
    if (k === sortBy) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(k);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  // Reset filters
  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDentistFilter('ALL');
    setPriorityFilter('ALL');
    setPage(1);
  }

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter !== 'ALL' || dentistFilter !== 'ALL' || priorityFilter !== 'ALL'
  );

  return (
    <div className="w-full max-w-full space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t('order.title')}</h1>
          <p className="text-muted-foreground">
            {t('order.subtitle')}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('order.newOrder')}
          </Link>
        </Button>
      </div>

      {/* Filters - Mobile drawer, desktop inline */}
      <OrderFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        dentistFilter={dentistFilter}
        priorityFilter={priorityFilter}
        dentists={dentists}
        hasActiveFilters={hasActiveFilters}
        userRole={session?.user?.role}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onDentistChange={setDentistFilter}
        onPriorityChange={setPriorityFilter}
        onResetFilters={resetFilters}
      />

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('order.loadingOrders')}</span>
        </div>
      ) : (
        <>
          <OrdersTable
            orders={orders}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onDelete={(orderId) => {
              setOrderToDelete(orderId);
              setDeleteDialogOpen(true);
            }}
          />

          {/* Pagination + per-page */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t('order.showing', {
                  from: total === 0 ? 0 : (page - 1) * limit + 1,
                  to: Math.min(page * limit, total),
                  total,
                })}
              </span>
              <span>|</span>
              <span>{t('order.perPage') || 'Per page'}:</span>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => handleLimitChange(n)}
                  className={`px-2 py-0.5 rounded text-xs border ${limit === n ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-primary'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {total > limit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('order.previous')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                >
                  {t('order.next')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('order.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('order.deleteConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
