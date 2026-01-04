'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface GenerateAnnexButtonProps {
  worksheetId: string;
}

export function GenerateAnnexButton({ worksheetId }: GenerateAnnexButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch(`/api/documents/annex-xiii/${worksheetId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: result.message || 'Annex XIII document generated successfully',
      });

      // Refresh the page to show the new document
      router.refresh();
    } catch (error) {
      console.error('Error generating Annex XIII:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate document',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      size="sm"
      variant="outline"
    >
      <FileText className="h-4 w-4 mr-2" />
      {isGenerating ? 'Generating...' : 'Generate Annex XIII'}
    </Button>
  );
}
