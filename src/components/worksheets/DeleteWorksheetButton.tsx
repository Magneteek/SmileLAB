'use client';

/**
 * Delete Worksheet Button
 *
 * Allows deletion of CANCELLED worksheets
 * Only visible for cancelled worksheets
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeleteWorksheetButtonProps {
  worksheetId: string;
  worksheetNumber: string;
  currentStatus: string;
  orderId: string;
}

export function DeleteWorksheetButton({
  worksheetId,
  worksheetNumber,
  currentStatus,
  orderId,
}: DeleteWorksheetButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only show for CANCELLED worksheets
  if (currentStatus !== 'CANCELLED') {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/worksheets/${worksheetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete worksheet');
      }

      toast({
        title: t('worksheet.deleteToastSuccess'),
        description: t('worksheet.deleteToastSuccessDesc', { number: worksheetNumber }),
      });

      setIsOpen(false);

      // Redirect to the order detail page
      router.push(`/orders/${orderId}`);
      router.refresh();
    } catch (error: any) {
      console.error('Failed to delete worksheet:', error);
      toast({
        title: t('worksheet.deleteToastError'),
        description: error.message || t('worksheet.deleteToastErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t('worksheet.deleteButton')}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              {t('worksheet.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('worksheet.deleteConfirmation', { number: worksheetNumber })}

              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {t('worksheet.deleteActionLabel')}
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>{t('worksheet.deleteBullet1')}</li>
                  <li>{t('worksheet.deleteBullet2')}</li>
                  <li>{t('worksheet.deleteBullet3')}</li>
                  <li>{t('worksheet.deleteBullet4')}</li>
                </ul>
              </div>

              <div className="mt-3 text-red-600 font-medium">
                {t('worksheet.deleteWarning')}
              </div>

              <div className="mt-2 text-sm text-gray-600">
                {t('worksheet.deleteOrderStatus')}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('worksheet.deleteCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('worksheet.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
