'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GenerateAnnexButtonProps {
  worksheetId: string;
}

export function GenerateAnnexButton({ worksheetId }: GenerateAnnexButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string>('en');
  const router = useRouter();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch(`/api/documents/annex-xiii/${worksheetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: selectedLocale }),
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
    <div className="flex items-center gap-2">
      <Select value={selectedLocale} onValueChange={setSelectedLocale}>
        <SelectTrigger className="w-[140px] h-9">
          <Languages className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English (EN)</SelectItem>
          <SelectItem value="sl">Slovenščina (SL)</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        size="sm"
        variant="outline"
      >
        <FileText className="h-4 w-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Generate'}
      </Button>
    </div>
  );
}
