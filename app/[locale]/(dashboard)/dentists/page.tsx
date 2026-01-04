'use client';

/**
 * Dentists List Page
 *
 * Displays all dentists/clinics with filtering and search.
 * Features: Active/inactive filter, city filter, search, pagination.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dentist } from '@prisma/client';
import { DentistsTable } from '@/components/dentists/DentistsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DentistListResponse } from '@/types/dentist';

export default function DentistsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();

  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('clinicName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Available cities (loaded from API)
  const [cities, setCities] = useState<string[]>([]);

  // Fetch dentists
  const fetchDentists = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (activeFilter !== 'all') {
        params.append('active', activeFilter);
      }

      if (cityFilter !== 'all') {
        params.append('city', cityFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/dentists?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dentists');
      }

      const data: DentistListResponse = await response.json();

      setDentists(data.dentists);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching dentists:', error);
      toast({
        title: t('dentist.toastErrorTitle'),
        description: t('dentist.toastErrorLoad'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cities for filter
  const fetchCities = async () => {
    try {
      // For now, we'll use the static list from types
      // In a real app, you could fetch this from an API endpoint
      const { SLOVENIAN_CITIES } = await import('@/types/dentist');
      // Remove duplicates using Set
      const uniqueCities = Array.from(new Set(SLOVENIAN_CITIES));
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, [page, activeFilter, cityFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('dentist.deleteConfirmation'))) {
      return;
    }

    try {
      const response = await fetch(`/api/dentists/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('dentist.toastErrorDelete'));
      }

      toast({
        title: t('dentist.toastSuccessTitle'),
        description: t('dentist.toastSuccessDelete'),
      });

      // Refresh list
      fetchDentists();
    } catch (error: any) {
      toast({
        title: t('dentist.toastErrorTitle'),
        description: error.message || t('dentist.toastErrorDelete'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('dentist.listTitle')}</h1>
          <p className="text-gray-500 mt-1">
            {t('dentist.listSubtitle')}
          </p>
        </div>
        <Link href="/dentists/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('dentist.newButton')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('dentist.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Active Filter */}
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('dentist.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dentist.allDentists')}</SelectItem>
              <SelectItem value="true">{t('dentist.activeOnly')}</SelectItem>
              <SelectItem value="false">{t('dentist.inactiveOnly')}</SelectItem>
            </SelectContent>
          </Select>

          {/* City Filter */}
          <Select
            value={cityFilter}
            onValueChange={(value) => {
              setCityFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('dentist.filterByCity')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">{t('dentist.allCities')}</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center gap-2 text-gray-600">
          <Filter className="h-4 w-4" />
          <span>
            {t('dentist.showingResults', { count: dentists?.length || 0, total })}
            {activeFilter !== 'all' &&
              ` ${activeFilter === 'true' ? t('dentist.filterActiveLabel') : t('dentist.filterInactiveLabel')}`}
            {cityFilter !== 'all' && ` ${t('dentist.filterInCity', { city: cityFilter })}`}
          </span>
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('dentist.loading')}</div>
      ) : (
        <>
          <DentistsTable
            dentists={dentists}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                {t('dentist.paginationPrevious')}
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      onClick={() => setPage(pageNum)}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                {t('dentist.paginationNext')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
