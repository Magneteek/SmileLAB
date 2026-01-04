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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Filter, Loader2, X } from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import { OrderWithRelations, OrderListResponse } from '@/types/order';

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
        params.set('limit', '20');

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
  }, [page, searchTerm, statusFilter, dentistFilter, priorityFilter]);

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

  // Reset filters
  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDentistFilter('ALL');
    setPriorityFilter('ALL');
    setPage(1);
  }

  const hasActiveFilters =
    searchTerm || statusFilter !== 'ALL' || dentistFilter !== 'ALL' || priorityFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('order.title')}</h1>
          <p className="text-muted-foreground">
            {t('order.subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('order.newOrder')}
          </Link>
        </Button>
      </div>

      {/* Filters - Compact Single Row */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <Input
              placeholder={t('order.searchPlaceholder')}
              className="w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as OrderStatus | 'ALL')}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('order.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('order.allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                <SelectItem value="IN_PRODUCTION">{t('status.in_production')}</SelectItem>
                <SelectItem value="QC_PENDING">{t('status.qc_pending')}</SelectItem>
                <SelectItem value="QC_APPROVED">{t('status.qc_approved')}</SelectItem>
                {/* Hide INVOICED filter for TECHNICIAN */}
                {session?.user?.role !== 'TECHNICIAN' && (
                  <>
                    <SelectItem value="INVOICED">{t('status.sent')}</SelectItem>
                    <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                  </>
                )}
                <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Dentist filter */}
            <Select value={dentistFilter} onValueChange={setDentistFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('order.allDentists')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('order.allDentists')}</SelectItem>
                {dentists.map((dentist) => (
                  <SelectItem key={dentist.id} value={dentist.id}>
                    {dentist.clinicName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('order.allPriorities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('order.allPriorities')}</SelectItem>
                <SelectItem value="0">{t('order.priorityNormal')}</SelectItem>
                <SelectItem value="1">{t('order.priorityHigh')}</SelectItem>
                <SelectItem value="2">{t('order.priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <X className="mr-2 h-4 w-4" />
                {t('order.clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
            onDelete={(orderId) => {
              setOrderToDelete(orderId);
              setDeleteDialogOpen(true);
            }}
          />

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('order.showing', {
                  from: (page - 1) * 20 + 1,
                  to: Math.min(page * 20, total),
                  total: total
                })}
              </p>
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
                  disabled={page * 20 >= total}
                >
                  {t('order.next')}
                </Button>
              </div>
            </div>
          )}
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
