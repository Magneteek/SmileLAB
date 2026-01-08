'use client';

/**
 * Void Worksheet Button
 *
 * Allows voiding QC_APPROVED+ worksheets due to errors
 * Preserved for audit trail
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoidWorksheetButtonProps {
  worksheetId: string;
  worksheetNumber: string;
  currentStatus: string;
  orderId: string;
}

export function VoidWorksheetButton({
  worksheetId,
  worksheetNumber,
  currentStatus,
  orderId,
}: VoidWorksheetButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  // Only show for QC_APPROVED or DELIVERED worksheets
  const voidableStatuses = ['QC_APPROVED', 'DELIVERED'];
  if (!voidableStatuses.includes(currentStatus)) {
    return null;
  }

  const handleVoid = async () => {
    if (!reason.trim()) {
      toast({
        title: t('worksheet.voidToastError'),
        description: t('worksheet.voidToastErrorDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/worksheets/${worksheetId}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to void worksheet');
      }

      toast({
        title: t('worksheet.voidToastSuccess'),
        description: t('worksheet.voidToastSuccessDesc', { number: worksheetNumber }),
      });

      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error('Failed to void worksheet:', error);
      toast({
        title: t('worksheet.voidToastError'),
        description: error.message || t('worksheet.voidToastErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        {t('worksheet.voidButton')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {t('worksheet.voidTitle')}
            </DialogTitle>
            <div className="text-muted-foreground text-sm">
              <p>{t('worksheet.voidingWorksheet', { number: worksheetNumber })}</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('worksheet.voidBullet1')}</li>
                <li>{t('worksheet.voidBullet2')}</li>
                <li>{t('worksheet.voidBullet3', { number: worksheetNumber })}</li>
                <li>{t('worksheet.voidBullet4')}</li>
              </ul>
              <p className="mt-3 text-red-600 font-medium">
                {t('worksheet.voidWarning')}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="voidReason">{t('worksheet.voidReasonLabel')}</Label>
            <Textarea
              id="voidReason"
              placeholder={t('worksheet.voidReasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
            <p className="text-sm text-gray-500">
              {t('worksheet.voidReasonHelp')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t('worksheet.voidCancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isLoading || !reason.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('worksheet.voidConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
