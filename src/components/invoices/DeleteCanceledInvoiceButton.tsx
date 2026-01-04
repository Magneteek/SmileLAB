'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
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

interface DeleteCanceledInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DeleteCanceledInvoiceButton({
  invoiceId,
  invoiceNumber,
}: DeleteCanceledInvoiceButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete invoice');
      }

      toast({
        title: 'Invoice Deleted',
        description: `Canceled invoice ${invoiceNumber} has been permanently deleted. Associated worksheets have been reverted to QC_APPROVED status.`,
      });

      // Redirect to invoices list
      router.push('/invoices');
      router.refresh();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete invoice',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={deleting} size="sm">
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Canceled Invoice?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will permanently delete invoice <strong>{invoiceNumber}</strong> from the system:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Invoice record will be removed from database</li>
              <li>PDF file will be deleted from disk</li>
              <li>Related worksheets will be reverted to QC_APPROVED status</li>
              <li>This action cannot be undone</li>
            </ul>
            <p className="font-semibold text-green-600 mt-4">
              ✅ The related worksheets will become available for re-invoicing.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
