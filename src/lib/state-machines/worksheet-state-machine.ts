/**
 * Worksheet State Machine
 * Enforces workflow rules and state transitions for worksheets
 *
 * State Flow:
 * DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → DELIVERED
 *                ↓ (rejection)
 *           IN_PRODUCTION (rework)
 *
 * Critical Rules:
 * - QC approval required before delivery
 * - Material consumption happens when transitioning to IN_PRODUCTION
 * - Annex XIII auto-generated on QC approval
 * - Status changes to DELIVERED when invoice is created/finalized
 * - Audit logs created on every transition
 */

import type { Role } from '@prisma/client';
import type { WorksheetStatus, StateTransitionValidation } from '@/types/worksheet';

// ============================================================================
// STATE MACHINE CONFIGURATION
// ============================================================================

/**
 * State definition with allowed transitions and requirements
 */
interface StateDefinition {
  canTransitionTo: WorksheetStatus[];
  requiredRoles: Role[];
  description: string;
  onEnter?: string[]; // Side effects when entering this state
  onExit?: string[];  // Side effects when leaving this state
}

/**
 * Complete state machine configuration
 */
export const WorksheetStateMachine: Record<WorksheetStatus, StateDefinition> = {
  DRAFT: {
    canTransitionTo: ['IN_PRODUCTION', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    description: 'Initial worksheet creation - can edit all fields',
    onEnter: [],
    onExit: [],
  },

  IN_PRODUCTION: {
    canTransitionTo: ['QC_PENDING', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    description: 'Worksheet being manufactured',
    onEnter: ['consumeMaterials', 'setManufactureDate'], // Side effects
    onExit: [],
  },

  QC_PENDING: {
    canTransitionTo: ['QC_APPROVED', 'QC_REJECTED'],
    requiredRoles: ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'],
    description: 'Awaiting quality control inspection',
    onEnter: [],
    onExit: [],
  },

  QC_APPROVED: {
    canTransitionTo: ['DELIVERED'],
    requiredRoles: ['ADMIN', 'INVOICING', 'TECHNICIAN'],
    description: 'Quality control approved - ready for delivery (auto-set when invoice created)',
    onEnter: ['generateAnnexXIII'], // Side effect: Generate MDR document
    onExit: [],
  },

  QC_REJECTED: {
    canTransitionTo: ['IN_PRODUCTION', 'CANCELLED'],
    requiredRoles: ['ADMIN', 'TECHNICIAN'],
    description: 'Quality control rejected - requires rework',
    onEnter: [],
    onExit: [],
  },

  DELIVERED: {
    canTransitionTo: [],
    requiredRoles: [],
    description: 'Final state - worksheet delivered to dentist (set when invoice created/finalized)',
    onEnter: ['setDeliveryDate'],
    onExit: [],
  },

  CANCELLED: {
    canTransitionTo: [],
    requiredRoles: [],
    description: 'Worksheet cancelled - terminal state',
    onEnter: [],
    onExit: [],
  },

  VOIDED: {
    canTransitionTo: [],
    requiredRoles: [],
    description: 'Worksheet voided due to error - preserved for audit trail',
    onEnter: [],
    onExit: [],
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a state transition is allowed
 * @param currentStatus - Current worksheet status
 * @param newStatus - Requested new status
 * @param userRole - Role of the user making the request
 * @returns Validation result with allowed flag and reason
 */
export function canTransition(
  currentStatus: WorksheetStatus,
  newStatus: WorksheetStatus,
  userRole: Role
): StateTransitionValidation {
  // Get state definition
  const stateDefinition = WorksheetStateMachine[currentStatus];

  if (!stateDefinition) {
    return {
      allowed: false,
      currentStatus,
      requestedStatus: newStatus,
      reason: `Invalid current status: ${currentStatus}`,
    };
  }

  // Check if transition is allowed
  if (!stateDefinition.canTransitionTo.includes(newStatus)) {
    return {
      allowed: false,
      currentStatus,
      requestedStatus: newStatus,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${stateDefinition.canTransitionTo.join(', ')}`,
    };
  }

  // Get target state definition for role checking
  const targetStateDefinition = WorksheetStateMachine[newStatus];

  // Check if user has required role
  if (targetStateDefinition.requiredRoles.length > 0) {
    if (!targetStateDefinition.requiredRoles.includes(userRole)) {
      return {
        allowed: false,
        currentStatus,
        requestedStatus: newStatus,
        reason: `User role '${userRole}' is not authorized for this transition. Required roles: ${targetStateDefinition.requiredRoles.join(', ')}`,
        requiredRoles: targetStateDefinition.requiredRoles,
      };
    }
  }

  // Transition is allowed
  return {
    allowed: true,
    currentStatus,
    requestedStatus: newStatus,
  };
}

/**
 * Get all available transitions from current status for a given user role
 * @param currentStatus - Current worksheet status
 * @param userRole - Role of the user
 * @returns Array of statuses the user can transition to
 */
export function getAvailableTransitions(
  currentStatus: WorksheetStatus,
  userRole: Role
): WorksheetStatus[] {
  const stateDefinition = WorksheetStateMachine[currentStatus];

  if (!stateDefinition) {
    return [];
  }

  // Filter transitions by user role
  return stateDefinition.canTransitionTo.filter((targetStatus) => {
    const validation = canTransition(currentStatus, targetStatus, userRole);
    return validation.allowed;
  });
}

/**
 * Check if user can perform any transition from current status
 * @param currentStatus - Current worksheet status
 * @param userRole - Role of the user
 * @returns true if user can perform at least one transition
 */
export function canPerformAnyTransition(
  currentStatus: WorksheetStatus,
  userRole: Role
): boolean {
  return getAvailableTransitions(currentStatus, userRole).length > 0;
}

// ============================================================================
// SIDE EFFECTS
// ============================================================================

/**
 * Get side effects (onEnter actions) for a state
 * @param status - Worksheet status
 * @returns Array of side effect action names
 */
export function getSideEffectsOnEnter(status: WorksheetStatus): string[] {
  const stateDefinition = WorksheetStateMachine[status];
  return stateDefinition?.onEnter ?? [];
}

/**
 * Get side effects (onExit actions) for a state
 * @param status - Worksheet status
 * @returns Array of side effect action names
 */
export function getSideEffectsOnExit(status: WorksheetStatus): string[] {
  const stateDefinition = WorksheetStateMachine[status];
  return stateDefinition?.onExit ?? [];
}

/**
 * Check if a state has side effects on enter
 * @param status - Worksheet status
 * @returns true if state has onEnter side effects
 */
export function hasSideEffectsOnEnter(status: WorksheetStatus): boolean {
  return getSideEffectsOnEnter(status).length > 0;
}

// ============================================================================
// STATE INFORMATION
// ============================================================================

/**
 * Get state description
 * @param status - Worksheet status
 * @returns Human-readable description of the state
 */
export function getStateDescription(status: WorksheetStatus): string {
  const stateDefinition = WorksheetStateMachine[status];
  return stateDefinition?.description ?? 'Unknown state';
}

/**
 * Get all terminal states (states with no outgoing transitions)
 * @returns Array of terminal statuses
 */
export function getTerminalStates(): WorksheetStatus[] {
  return Object.entries(WorksheetStateMachine)
    .filter(([_, definition]) => definition.canTransitionTo.length === 0)
    .map(([status]) => status as WorksheetStatus);
}

/**
 * Check if a status is terminal (no outgoing transitions)
 * @param status - Worksheet status
 * @returns true if status is terminal
 */
export function isTerminalState(status: WorksheetStatus): boolean {
  return getTerminalStates().includes(status);
}

/**
 * Get all statuses that require specific role
 * @param role - User role
 * @returns Array of statuses that require this role
 */
export function getStatusesRequiringRole(role: Role): WorksheetStatus[] {
  return Object.entries(WorksheetStateMachine)
    .filter(([_, definition]) => definition.requiredRoles.includes(role))
    .map(([status]) => status as WorksheetStatus);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a sequence of transitions
 * @param startStatus - Starting worksheet status
 * @param transitions - Array of statuses to transition through
 * @param userRole - Role of the user
 * @returns Validation result for the entire sequence
 */
export function validateTransitionSequence(
  startStatus: WorksheetStatus,
  transitions: WorksheetStatus[],
  userRole: Role
): StateTransitionValidation {
  let currentStatus = startStatus;

  for (const nextStatus of transitions) {
    const validation = canTransition(currentStatus, nextStatus, userRole);

    if (!validation.allowed) {
      return {
        allowed: false,
        currentStatus,
        requestedStatus: nextStatus,
        reason: `Sequence failed at ${currentStatus} → ${nextStatus}: ${validation.reason}`,
        requiredRoles: validation.requiredRoles,
      };
    }

    currentStatus = nextStatus;
  }

  return {
    allowed: true,
    currentStatus: startStatus,
    requestedStatus: transitions[transitions.length - 1] ?? startStatus,
  };
}

/**
 * Get the expected workflow path from DRAFT to DELIVERED
 * @returns Array of statuses in the happy path
 */
export function getHappyPath(): WorksheetStatus[] {
  return [
    'DRAFT',
    'IN_PRODUCTION',
    'QC_PENDING',
    'QC_APPROVED',
    'DELIVERED',
  ];
}

/**
 * Check if current status is on the happy path
 * @param status - Current worksheet status
 * @returns true if status is part of the standard workflow
 */
export function isOnHappyPath(status: WorksheetStatus): boolean {
  return getHappyPath().includes(status);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type StateDefinition,
};
