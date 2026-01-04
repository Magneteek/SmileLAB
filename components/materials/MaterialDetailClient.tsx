'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { MaterialLotsTable } from './MaterialLotsTable';
import { MaterialLotWithMaterial } from '@/types/material';
import { MaterialLotStatus } from '@prisma/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface MaterialDetailClientProps {
  materialId: string;
}

export function MaterialDetailClient({ materialId }: MaterialDetailClientProps) {
  const t = useTranslations('material');
  const [lots, setLots] = useState<MaterialLotWithMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLots();
  }, [materialId]);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/${materialId}/lots`);
      if (!response.ok) throw new Error('Failed to fetch LOTs');
      const result = await response.json();
      // API returns { data: [...], pagination: {...} }
      setLots(result.data || []);
    } catch (error) {
      console.error('Error fetching LOTs:', error);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (lotId: string, status: MaterialLotStatus) => {
    try {
      const response = await fetch(`/api/materials/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update LOT status');
      }

      toast({
        title: t('toastStatusUpdateSuccessTitle'),
        description: t('toastStatusUpdateSuccessDesc', { status }),
      });

      // Refresh LOTs
      fetchLots();
    } catch (error: any) {
      toast({
        title: t('toastStatusUpdateErrorTitle'),
        description: error.message || t('toastStatusUpdateErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (lotId: string) => {
    if (!confirm(t('deleteLOTConfirmation'))) {
      return;
    }

    try {
      const response = await fetch(`/api/materials/lots/${lotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete LOT');
      }

      toast({
        title: t('toastDeleteLOTSuccessTitle'),
        description: t('toastDeleteLOTSuccessDesc'),
      });

      // Refresh LOTs
      fetchLots();
    } catch (error: any) {
      toast({
        title: t('toastDeleteLOTErrorTitle'),
        description: error.message || t('toastDeleteLOTErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Tabs defaultValue="lots" className="w-full">
      <TabsList>
        <TabsTrigger value="lots">{t('tabLOTs')}</TabsTrigger>
        <TabsTrigger value="statistics">{t('tabStatistics')}</TabsTrigger>
      </TabsList>

      <TabsContent value="lots">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MaterialLotsTable
                lots={lots}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="statistics">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('statsTotalLOTs')}</p>
                <p className="text-2xl font-bold">{lots.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('statsAvailableLOTs')}</p>
                <p className="text-2xl font-bold">
                  {lots.filter((lot) => lot.status === 'AVAILABLE').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('statsTotalQuantityAvailable')}</p>
                <p className="text-2xl font-bold">
                  {lots
                    .filter((lot) => lot.status === 'AVAILABLE')
                    .reduce((sum, lot) => sum + Number(lot.quantityAvailable), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
