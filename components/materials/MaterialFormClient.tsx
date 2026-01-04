'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MaterialForm } from './MaterialForm';
import { useToast } from '@/components/ui/use-toast';

export function MaterialFormClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create material');
      }

      toast({ title: 'Success', description: 'Material created successfully' });
      router.push('/materials');
      router.refresh();
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create material',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaterialForm
      onSubmit={handleSubmit}
      onCancel={() => router.push('/materials')}
      isLoading={isLoading}
    />
  );
}
