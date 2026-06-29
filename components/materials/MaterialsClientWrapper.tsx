'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MaterialsTable } from './MaterialsTable';
import { QuickAddLotModal } from './QuickAddLotModal';
import { MaterialWithLots } from '@/types/material';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { MaterialType } from '@prisma/client';

const PAGE_SIZE = 20;

export function MaterialsClientWrapper() {
  const t = useTranslations();
  const [materials, setMaterials] = useState<MaterialWithLots[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MaterialType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();
  const router = useRouter();

  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    name: string;
    unit: string;
  } | null>(null);

  const fetchMaterials = async (opts: {
    search?: string;
    filterType?: MaterialType | 'all';
    filterActive?: boolean | 'all';
    page?: number;
  } = {}) => {
    const s = opts.search ?? search;
    const ft = opts.filterType ?? filterType;
    const fa = opts.filterActive ?? filterActive;
    const p = opts.page ?? page;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(PAGE_SIZE));
      if (s.trim()) params.set('search', s.trim());
      if (ft !== 'all') params.set('type', ft);
      if (fa !== 'all') params.set('active', String(fa));

      const response = await fetch(`/api/materials?${params}`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      const result = await response.json();
      setMaterials(result.data || []);
      setTotal(result.pagination?.total ?? 0);
      setTotalPages(result.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchMaterials({ search: value, page: 1 });
    }, 300);
  };

  const handleFilterType = (value: MaterialType | 'all') => {
    setFilterType(value);
    setPage(1);
    fetchMaterials({ filterType: value, page: 1 });
  };

  const handleFilterActive = (value: boolean | 'all') => {
    setFilterActive(value);
    setPage(1);
    fetchMaterials({ filterActive: value, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMaterials({ page: newPage });
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update material status');
      }

      toast({
        title: t('material.toastToggleSuccessTitle'),
        description: !currentActive
          ? t('material.toastToggleSuccessActive')
          : t('material.toastToggleSuccessInactive'),
      });

      fetchMaterials();
    } catch (error: any) {
      toast({
        title: t('material.toastToggleErrorTitle'),
        description: error.message || t('material.toastToggleErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('material.deleteConfirmation'))) return;

    try {
      const response = await fetch(`/api/materials/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete material');
      }

      toast({
        title: t('material.toastDeleteSuccessTitle'),
        description: t('material.toastDeleteSuccessDesc'),
      });

      fetchMaterials();
    } catch (error: any) {
      toast({
        title: t('material.toastDeleteErrorTitle'),
        description: error.message || t('material.toastDeleteErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/materials/${id}/edit`);
  };

  const handleQuickAddLot = (material: MaterialWithLots) => {
    setSelectedMaterial({ id: material.id, name: material.name, unit: material.unit });
    setQuickAddModalOpen(true);
  };

  return (
    <>
      <MaterialsTable
        materials={materials}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        searchValue={search}
        filterTypeValue={filterType}
        filterActiveValue={filterActive}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        onQuickAddLot={handleQuickAddLot}
        onSearch={handleSearch}
        onFilterType={handleFilterType}
        onFilterActive={handleFilterActive}
      />

      {/* Pagination */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-sm text-muted-foreground">
            Prikazano {materials.length} od {total}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedMaterial && (
        <QuickAddLotModal
          materialId={selectedMaterial.id}
          materialName={selectedMaterial.name}
          materialUnit={selectedMaterial.unit}
          isOpen={quickAddModalOpen}
          onClose={() => setQuickAddModalOpen(false)}
          onSuccess={() => fetchMaterials()}
        />
      )}
    </>
  );
}
