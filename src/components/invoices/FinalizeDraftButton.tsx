'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FinalizeDraftButtonProps {
  invoiceId: string;
  invoiceNumber?: string | null;
}

export function FinalizeDraftButton({
  invoiceId,
  invoiceNumber,
}: FinalizeDraftButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [finalizing, setFinalizing] = useState(false);

  const handleFinalize = async () => {
    try {
      setFinalizing(true);

      const response = await fetch(`/api/invoices/${invoiceId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize invoice');
      }

      const result = await response.json();
      const finalizedInvoice = result.data || result;

      // Show success message (with warning if PDF generation failed)
      if (finalizedInvoice.pdfError) {
        toast({
          title: 'Invoice Finalized',
          description: `Invoice ${finalizedInvoice.invoiceNumber} has been finalized. Warning: PDF generation failed - ${finalizedInvoice.pdfError}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Invoice Finalized',
          description: `Invoice ${finalizedInvoice.invoiceNumber} has been finalized and assigned a sequential number. PDF generated successfully.`,
        });
      }

      // Force full page reload to show finalized state with fresh data
      window.location.reload();
    } catch (error) {
      console.error('Error finalizing invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to finalize invoice',
        variant: 'destructive',
      });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={finalizing} size="lg">
          {finalizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizing...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize Invoice
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalize Draft Invoice?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will assign a sequential invoice number (e.g., RAC-2025-001) and generate the PDF document.
            </p>
            <p className="font-semibold text-yellow-600">
              ⚠️ Once finalized, the invoice cannot be edited. You can only cancel it and create a new one.
            </p>
            <p>
              Are you sure you want to finalize this invoice?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFinalize} disabled={finalizing}>
            {finalizing ? 'Finalizing...' : 'Yes, Finalize Invoice'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
