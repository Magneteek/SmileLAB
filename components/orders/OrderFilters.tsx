'use client';

/**
 * Order Filters Component
 * Client component for order filtering with mobile drawer
 */

import { useTranslations } from 'next-intl';
import { FilterDrawer } from '@/components/ui/filter-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

interface Dentist {
  id: string;
  clinicName: string;
  dentistName: string;
}

interface OrderFiltersProps {
  searchTerm: string;
  statusFilter: OrderStatus | 'ALL';
  dentistFilter: string;
  priorityFilter: string;
  dentists: Dentist[];
  hasActiveFilters: boolean;
  userRole?: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | 'ALL') => void;
  onDentistChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onResetFilters: () => void;
}

export function OrderFilters({
  searchTerm,
  statusFilter,
  dentistFilter,
  priorityFilter,
  dentists,
  hasActiveFilters,
  userRole,
  onSearchChange,
  onStatusChange,
  onDentistChange,
  onPriorityChange,
  onResetFilters,
}: OrderFiltersProps) {
  const t = useTranslations();

  return (
    <FilterDrawer
      title={t('order.filters')}
      description={t('order.subtitle')}
      triggerLabel={t('order.filters')}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:p-0">
        {/* Search */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="search" className="text-xs font-medium md:sr-only">
            {t('order.searchPlaceholder')}
          </label>
          <Input
            id="search"
            placeholder={t('order.searchPlaceholder')}
            className="w-full"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="status" className="text-xs font-medium md:sr-only">
            {t('order.allStatuses')}
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as OrderStatus | 'ALL')}
          >
            <SelectTrigger className="w-full" id="status">
              <SelectValue placeholder={t('order.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('order.allStatuses')}</SelectItem>
              <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
              <SelectItem value="IN_PRODUCTION">{t('status.in_production')}</SelectItem>
              <SelectItem value="QC_PENDING">{t('status.qc_pending')}</SelectItem>
              <SelectItem value="QC_APPROVED">{t('status.qc_approved')}</SelectItem>
              {userRole !== 'TECHNICIAN' && (
                <>
                  <SelectItem value="INVOICED">{t('status.sent')}</SelectItem>
                  <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                </>
              )}
              <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dentist filter */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="dentist" className="text-xs font-medium md:sr-only">
            {t('order.allDentists')}
          </label>
          <Select value={dentistFilter} onValueChange={onDentistChange}>
            <SelectTrigger className="w-full" id="dentist">
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
        </div>

        {/* Priority filter */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="priority" className="text-xs font-medium md:sr-only">
            {t('order.allPriorities')}
          </label>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-full" id="priority">
              <SelectValue placeholder={t('order.allPriorities')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('order.allPriorities')}</SelectItem>
              <SelectItem value="0">{t('order.priorityNormal')}</SelectItem>
              <SelectItem value="1">{t('order.priorityHigh')}</SelectItem>
              <SelectItem value="2">{t('order.priorityUrgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="w-full md:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            <span className="truncate">{t('order.clear')}</span>
          </Button>
        )}
      </div>
    </FilterDrawer>
  );
}
