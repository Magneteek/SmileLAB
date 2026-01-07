/**
 * Worksheet State Machine
 *
 * Defines the state transitions for worksheets.
 * State flow: DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → DELIVERED (auto-set when invoice created)
 *
 * Role Permissions:
 * - TECHNICIAN: Can create, start production, submit to QC, perform QC, and cancel worksheets (for fixing mistakes)
 * - QC_INSPECTOR: Can approve/reject QC
 * - INVOICING: Can mark as delivered (via invoice creation)
 * - ADMIN: Full access to all transitions
 */

import { WorksheetStatus, Role } from '@prisma/client';

interface TransitionValidation {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a state transition is allowed based on current status, target status, and user role
 */
export function canTransition(
  currentStatus: WorksheetStatus,
  targetStatus: WorksheetStatus,
  userRole?: Role
): TransitionValidation {
  // Define allowed transitions
  const transitions: Record<WorksheetStatus, WorksheetStatus[]> = {
    [WorksheetStatus.DRAFT]: [WorksheetStatus.IN_PRODUCTION, WorksheetStatus.CANCELLED],
    [WorksheetStatus.IN_PRODUCTION]: [WorksheetStatus.QC_PENDING, WorksheetStatus.CANCELLED],
    [WorksheetStatus.QC_PENDING]: [WorksheetStatus.QC_APPROVED, WorksheetStatus.QC_REJECTED, WorksheetStatus.CANCELLED],
    [WorksheetStatus.QC_APPROVED]: [WorksheetStatus.DELIVERED, WorksheetStatus.CANCELLED],
    [WorksheetStatus.QC_REJECTED]: [WorksheetStatus.IN_PRODUCTION, WorksheetStatus.CANCELLED],
    [WorksheetStatus.DELIVERED]: [],
    [WorksheetStatus.CANCELLED]: [],
    [WorksheetStatus.VOIDED]: [],
  };

  // Check if transition is valid in state machine
  const allowedStatuses = transitions[currentStatus] || [];
  if (!allowedStatuses.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
    };
  }

  // If no role provided, only check state machine rules
  if (!userRole) {
    return { allowed: true };
  }

  // Define role requirements for each transition
  const roleRequirements: Record<string, Role[]> = {
    'DRAFT->IN_PRODUCTION': ['ADMIN', 'TECHNICIAN'],
    'IN_PRODUCTION->QC_PENDING': ['ADMIN', 'TECHNICIAN'],
    'QC_PENDING->QC_APPROVED': ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'],
    'QC_PENDING->QC_REJECTED': ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'],
    'QC_APPROVED->DELIVERED': ['ADMIN', 'INVOICING', 'TECHNICIAN'],
    // CANCELLED can be done by ADMIN and TECHNICIAN (for fixing mistakes)
    'DRAFT->CANCELLED': ['ADMIN', 'TECHNICIAN'],
    'IN_PRODUCTION->CANCELLED': ['ADMIN', 'TECHNICIAN'],
    'QC_PENDING->CANCELLED': ['ADMIN', 'TECHNICIAN'],
    'QC_APPROVED->CANCELLED': ['ADMIN'],
    'QC_REJECTED->CANCELLED': ['ADMIN', 'TECHNICIAN'],
    'QC_REJECTED->IN_PRODUCTION': ['ADMIN', 'TECHNICIAN'],
  };

  const transitionKey = `${currentStatus}->${targetStatus}`;
  const requiredRoles = roleRequirements[transitionKey];

  if (!requiredRoles) {
    // No specific role requirement, allow if state machine allows it
    return { allowed: true };
  }

  if (!requiredRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `This action requires one of the following roles: ${requiredRoles.join(', ')}. Your role: ${userRole}`,
    };
  }

  return { allowed: true };
}

/**
 * Get side effects that should run when entering a state
 */
export function getSideEffectsOnEnter(status: WorksheetStatus): string[] {
  const effects: Record<WorksheetStatus, string[]> = {
    DRAFT: [],
    IN_PRODUCTION: ['consume-materials'], // Deferred material consumption
    QC_PENDING: ['notify-qc-inspector'],
    QC_APPROVED: ['generate-annex-xiii'],
    QC_REJECTED: ['notify-technician', 'revert-materials'],
    DELIVERED: ['mark-order-complete'], // Set when invoice is created/finalized
    CANCELLED: ['revert-materials', 'notify-dentist'],
    VOIDED: [],
  };

  return effects[status] ?? [];
}
