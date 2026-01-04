'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MaterialsTable } from './MaterialsTable';
import { MaterialWithLots } from '@/types/material';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export function MaterialsClientWrapper() {
  const t = useTranslations();
  const [materials, setMaterials] = useState<MaterialWithLots[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/materials');
      if (!response.ok) throw new Error('Failed to fetch materials');
      const result = await response.json();
      // API returns { data: [...], pagination: {...} }
      setMaterials(result.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
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

      // Refresh materials
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
    if (!confirm(t('material.deleteConfirmation'))) {
      return;
    }

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete material');
      }

      toast({
        title: t('material.toastDeleteSuccessTitle'),
        description: t('material.toastDeleteSuccessDesc'),
      });

      // Refresh materials
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MaterialsTable
      materials={materials}
      onEdit={handleEdit}
      onToggleActive={handleToggleActive}
      onDelete={handleDelete}
    />
  );
}
