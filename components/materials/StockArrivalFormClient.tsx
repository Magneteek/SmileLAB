'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StockArrivalForm } from './StockArrivalForm';
import { useToast } from '@/components/ui/use-toast';

interface StockArrivalFormClientProps {
  materialId: string;
  materialName: string;
}

export function StockArrivalFormClient({ materialId, materialName }: StockArrivalFormClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/materials/${materialId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record stock arrival');
      }

      toast({ title: 'Success', description: 'Stock arrival recorded successfully' });
      router.push(`/materials/${materialId}`);
      router.refresh();
    } catch (error) {
      console.error('Error recording stock arrival:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record stock arrival',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StockArrivalForm
      materialId={materialId}
      materialName={materialName}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/materials/${materialId}`)}
      isLoading={isLoading}
    />
  );
}
