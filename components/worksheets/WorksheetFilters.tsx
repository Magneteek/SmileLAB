'use client';

/**
 * Worksheet Filters Component
 * Client component for worksheet filtering with mobile drawer
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

interface WorksheetFiltersProps {
  search?: string;
  status?: string;
}

export function WorksheetFilters({ search, status }: WorksheetFiltersProps) {
  const t = useTranslations();

  return (
    <FilterDrawer
      title={t('worksheet.applyFilters')}
      description={t('worksheet.subtitle')}
      triggerLabel={t('worksheet.applyFilters')}
    >
      <form method="get" action="/worksheets" className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:p-0">
        {/* Search */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="search" className="text-xs font-medium md:sr-only">
            {t('order.searchPlaceholder')}
          </label>
          <Input
            type="text"
            id="search"
            name="search"
            placeholder={t('order.searchPlaceholder')}
            defaultValue={search}
            className="w-full"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label htmlFor="status" className="text-xs font-medium md:sr-only">
            {t('order.allStatuses')}
          </label>
          <Select name="status" defaultValue={status || 'ALL'}>
            <SelectTrigger className="w-full" id="status">
              <SelectValue placeholder={t('order.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('order.allStatuses')}</SelectItem>
              <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
              <SelectItem value="IN_PRODUCTION">{t('status.in_production')}</SelectItem>
              <SelectItem value="QC_PENDING">{t('status.qc_pending')}</SelectItem>
              <SelectItem value="QC_APPROVED">{t('status.qc_approved')}</SelectItem>
              <SelectItem value="QC_REJECTED">{t('status.qc_rejected')}</SelectItem>
              <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
              <SelectItem value="CANCELLED">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Apply Filters Button */}
        <Button type="submit" className="w-full md:w-auto whitespace-nowrap">
          {t('worksheet.applyFilters')}
        </Button>
      </form>
    </FilterDrawer>
  );
}
