'use client';

/**
 * Rollback Worksheet to Draft Button
 *
 * Allows rolling back IN_PRODUCTION worksheets to DRAFT for corrections
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Undo2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RollbackWorksheetButtonProps {
  worksheetId: string;
  worksheetNumber: string;
  currentStatus: string;
}

export function RollbackWorksheetButton({
  worksheetId,
  worksheetNumber,
  currentStatus,
}: RollbackWorksheetButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  // Only show for IN_PRODUCTION worksheets
  if (currentStatus !== 'IN_PRODUCTION') {
    return null;
  }

  const handleRollback = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rolling back',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/worksheets/${worksheetId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rollback worksheet');
      }

      toast({
        title: 'Success',
        description: `${worksheetNumber} has been rolled back to DRAFT`,
      });

      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error('Failed to rollback worksheet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to rollback worksheet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Undo2 className="h-4 w-4 mr-2" />
        Rollback to Draft
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback to Draft</DialogTitle>
            <DialogDescription>
              Rolling back {worksheetNumber} to DRAFT status allows you to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Edit worksheet details</li>
                <li>Modify products or materials</li>
                <li>Cancel the worksheet if needed</li>
              </ul>
              <p className="mt-2 text-yellow-600 font-medium">
                This action will be logged in the audit trail.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for rollback *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Wrong material selected, need to add more products, patient request change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRollback}
              disabled={isLoading || !reason.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rollback to Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
