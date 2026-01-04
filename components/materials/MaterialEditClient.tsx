'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MaterialForm } from './MaterialForm';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { MaterialWithLots } from '@/types/material';

interface MaterialEditClientProps {
  materialId: string;
}

export function MaterialEditClient({ materialId }: MaterialEditClientProps) {
  const router = useRouter();
  const [material, setMaterial] = useState<MaterialWithLots | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterial();
  }, [materialId]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/${materialId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch material');
      }

      const data = await response.json();
      setMaterial(data);
    } catch (error) {
      console.error('Error fetching material:', error);
      toast({
        title: 'Error',
        description: 'Failed to load material data',
        variant: 'destructive',
      });
      router.push('/materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update material');
      }

      toast({
        title: 'Success',
        description: 'Material updated successfully'
      });

      router.push('/materials');
      router.refresh();
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update material',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Material not found</p>
      </div>
    );
  }

  return (
    <MaterialForm
      initialData={{
        code: material.code,
        name: material.name,
        type: material.type,
        manufacturer: material.manufacturer,
        description: material.description || '',
        biocompatible: material.biocompatible,
        iso10993Cert: material.iso10993Cert || '',
        ceMarked: material.ceMarked,
        ceNumber: material.ceNumber || '',
        unit: material.unit as 'gram' | 'ml' | 'piece' | 'disc',
        active: material.active,
      }}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/materials')}
      isLoading={isSubmitting}
    />
  );
}
