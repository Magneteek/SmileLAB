'use client';

/**
 * Status Transition Controls
 *
 * Displays available status transitions for a worksheet based on:
 * - Current worksheet status
 * - User role permissions
 * - State machine rules
 *
 * Shows action buttons for each allowed transition with confirmation dialogs
 * for critical transitions.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { getAvailableTransitions } from '@/src/lib/state-machines/worksheet-state-machine';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  PlayCircle,
  ClipboardCheck,
  FileText,
  Truck,
  Ban,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { WorksheetStatus, Role } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface StatusTransitionControlsProps {
  worksheetId: string;
  currentStatus: WorksheetStatus;
  userRole: Role;
  orderId?: string; // Optional for creating revision worksheets from voided worksheets
}

interface TransitionAction {
  targetStatus: WorksheetStatus;
  labelKey: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline';
  requiresConfirmation: boolean;
  requiresNotes: boolean;
  descKey: string;
}

// ============================================================================
// STATUS TRANSITION ACTIONS
// ============================================================================

const transitionActions: Record<string, TransitionAction> = {
  'DRAFT->IN_PRODUCTION': {
    targetStatus: 'IN_PRODUCTION',
    labelKey: 'worksheet.workflowStartProduction',
    icon: <PlayCircle className="h-4 w-4" />,
    variant: 'default',
    requiresConfirmation: true,
    requiresNotes: false,
    descKey: 'worksheet.workflowStartProductionDesc',
  },
  'IN_PRODUCTION->QC_PENDING': {
    targetStatus: 'QC_PENDING',
    labelKey: 'worksheet.workflowSubmitQC',
    icon: <ClipboardCheck className="h-4 w-4" />,
    variant: 'default',
    requiresConfirmation: false,
    requiresNotes: false,
    descKey: 'worksheet.workflowSubmitQCDesc',
  },
  'QC_PENDING->QC_APPROVED': {
    targetStatus: 'QC_APPROVED',
    labelKey: 'worksheet.workflowApproveQC',
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: 'default',
    requiresConfirmation: true,
    requiresNotes: false,
    descKey: 'worksheet.workflowApproveQCDesc',
  },
  'QC_PENDING->QC_REJECTED': {
    targetStatus: 'QC_REJECTED',
    labelKey: 'worksheet.workflowRejectQC',
    icon: <XCircle className="h-4 w-4" />,
    variant: 'destructive',
    requiresConfirmation: true,
    requiresNotes: true,
    descKey: 'worksheet.workflowRejectQCDesc',
  },
  'QC_REJECTED->IN_PRODUCTION': {
    targetStatus: 'IN_PRODUCTION',
    labelKey: 'worksheet.workflowResumeProduction',
    icon: <PlayCircle className="h-4 w-4" />,
    variant: 'default',
    requiresConfirmation: false,
    requiresNotes: false,
    descKey: 'worksheet.workflowResumeProductionDesc',
  },
  'DRAFT->CANCELLED': {
    targetStatus: 'CANCELLED',
    labelKey: 'worksheet.workflowCancelWorksheet',
    icon: <Ban className="h-4 w-4" />,
    variant: 'destructive',
    requiresConfirmation: true,
    requiresNotes: true,
    descKey: 'worksheet.workflowCancelWorksheetDesc',
  },
  'IN_PRODUCTION->CANCELLED': {
    targetStatus: 'CANCELLED',
    labelKey: 'worksheet.workflowCancelWorksheet',
    icon: <Ban className="h-4 w-4" />,
    variant: 'destructive',
    requiresConfirmation: true,
    requiresNotes: true,
    descKey: 'worksheet.workflowCancelWorksheetDesc',
  },
  'QC_REJECTED->CANCELLED': {
    targetStatus: 'CANCELLED',
    labelKey: 'worksheet.workflowCancelWorksheet',
    icon: <Ban className="h-4 w-4" />,
    variant: 'destructive',
    requiresConfirmation: true,
    requiresNotes: true,
    descKey: 'worksheet.workflowCancelWorksheetDesc',
  },
};

// State machine transitions (from worksheet-state-machine.ts)
// Note: QC_APPROVED automatically transitions to DELIVERED when invoice is created
const allowedTransitions: Record<WorksheetStatus, WorksheetStatus[]> = {
  DRAFT: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['QC_PENDING', 'CANCELLED'],
  QC_PENDING: ['QC_APPROVED', 'QC_REJECTED'],
  QC_APPROVED: ['DELIVERED'], // Auto-set when invoice is created/finalized
  QC_REJECTED: ['IN_PRODUCTION', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  VOIDED: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusTransitionControls({
  worksheetId,
  currentStatus,
  userRole,
  orderId,
}: StatusTransitionControlsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: TransitionAction | null;
  }>({ open: false, action: null });
  const [notes, setNotes] = useState('');
  const [missingLotWarning, setMissingLotWarning] = useState<{
    count: number;
    message: string;
  } | null>(null);

  // Get available transitions for current status based on user role
  // Uses state machine to enforce role-based permissions
  const availableTransitions = getAvailableTransitions(currentStatus, userRole);

  if (availableTransitions.length === 0) {
    // Special handling for VOIDED status - show button to create revision worksheet
    if (currentStatus === 'VOIDED' && orderId) {
      return (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('worksheet.workflowVoidedMessage')}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {t('worksheet.workflowCreateRevision')}
          </Button>
        </div>
      );
    }

    // Default message for terminal states
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {currentStatus === 'DELIVERED'
            ? t('worksheet.workflowDeliveredMessage')
            : currentStatus === 'CANCELLED'
            ? t('worksheet.workflowCancelledMessage')
            : currentStatus === 'VOIDED'
            ? t('worksheet.workflowVoidedMessage')
            : t('worksheet.workflowNoTransitions')}
        </AlertDescription>
      </Alert>
    );
  }

  const checkForMissingLots = async () => {
    try {
      const response = await fetch(`/api/worksheets/${worksheetId}`);
      if (!response.ok) return;

      const worksheet = await response.json();

      // Check all products for materials without LOT numbers
      let missingLotCount = 0;

      if (worksheet.products) {
        for (const product of worksheet.products) {
          if (product.productMaterials) {
            const materialsWithoutLot = product.productMaterials.filter(
              (pm: any) => !pm.materialLotId
            );
            missingLotCount += materialsWithoutLot.length;
          }
        }
      }

      if (missingLotCount > 0) {
        setMissingLotWarning({
          count: missingLotCount,
          message: t('worksheet.workflowMissingLotsWarning', {
            count: missingLotCount,
            s: missingLotCount > 1 ? 's' : ''
          }),
        });
      } else {
        setMissingLotWarning(null);
      }
    } catch (err) {
      console.error('Failed to check for missing LOTs:', err);
      setMissingLotWarning(null);
    }
  };

  const handleTransitionClick = async (targetStatus: WorksheetStatus) => {
    const actionKey = `${currentStatus}->${targetStatus}`;
    const action = transitionActions[actionKey];

    if (!action) {
      console.error(`No action defined for transition: ${actionKey}`);
      return;
    }

    // BUG-001 FIX: Redirect to QC inspection page instead of shortcut
    if (actionKey === 'QC_PENDING->QC_APPROVED') {
      router.push(`/worksheets/${worksheetId}/qc`);
      return;
    }

    // Check for missing LOT numbers when starting production
    if (actionKey === 'DRAFT->IN_PRODUCTION') {
      await checkForMissingLots();
    } else {
      setMissingLotWarning(null);
    }

    if (action.requiresConfirmation) {
      setConfirmDialog({ open: true, action });
      setNotes('');
      setError(null);
    } else {
      performTransition(targetStatus, '');
    }
  };

  const handleConfirmTransition = () => {
    if (!confirmDialog.action) return;

    if (confirmDialog.action.requiresNotes && !notes.trim()) {
      setError(t('worksheet.workflowNotesRequired'));
      return;
    }

    performTransition(confirmDialog.action.targetStatus, notes);
    setConfirmDialog({ open: false, action: null });
    setNotes('');
  };

  const performTransition = async (newStatus: WorksheetStatus, transitionNotes: string) => {
    setIsTransitioning(true);
    setError(null);

    try {
      const response = await fetch(`/api/worksheets/${worksheetId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus,
          notes: transitionNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transition worksheet status');
      }

      // Success - refresh the page to show updated status
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to transition worksheet status');
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {availableTransitions.map((targetStatus) => {
          const actionKey = `${currentStatus}->${targetStatus}`;
          const action = transitionActions[actionKey];

          if (!action) return null;

          return (
            <Button
              key={targetStatus}
              variant={action.variant}
              onClick={() => handleTransitionClick(targetStatus)}
              disabled={isTransitioning}
            >
              {isTransitioning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <span className="mr-2">{action.icon}</span>
              )}
              {t(action.labelKey)}
            </Button>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, action: null });
            setNotes('');
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action && t(confirmDialog.action.labelKey)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action && t(confirmDialog.action.descKey)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Warning for missing LOT numbers */}
          {missingLotWarning && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>⚠️ Warning:</strong> {missingLotWarning.message}
              </AlertDescription>
            </Alert>
          )}

          {confirmDialog.action?.requiresNotes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('worksheet.workflowNotesLabel')} {confirmDialog.action.requiresNotes && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('worksheet.workflowNotesPlaceholder')}
                rows={4}
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransitioning}>
              {t('worksheet.workflowCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmTransition();
              }}
              disabled={isTransitioning}
            >
              {isTransitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('worksheet.workflowConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
