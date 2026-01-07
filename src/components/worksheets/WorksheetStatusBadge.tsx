/**
 * WorksheetStatusBadge - Status Display Component
 *
 * Displays worksheet status with appropriate colors and icons following
 * the state machine workflow. Provides visual consistency across the application.
 *
 * Features:
 * - Color-coded status badges
 * - Status-specific icons
 * - Responsive design
 * - Optional size variants
 * - Tooltip with status description
 *
 * State Machine Flow:
 * DRAFT → IN_PRODUCTION → QC_PENDING → QC_APPROVED → DELIVERED (auto-set when invoice created)
 *                ↓ (rejection)
 *           QC_REJECTED (can return to IN_PRODUCTION)
 *
 * @example
 * ```tsx
 * <WorksheetStatusBadge status="IN_PRODUCTION" />
 * <WorksheetStatusBadge status="QC_APPROVED" size="lg" />
 * ```
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { WorksheetStatus } from '@/src/types/worksheet';
import {
  FileEdit,
  Hammer,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface WorksheetStatusBadgeProps {
  /**
   * Worksheet status from state machine
   */
  status: WorksheetStatus | string;

  /**
   * Optional size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Show icon
   */
  showIcon?: boolean;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

interface StatusConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClass: string;
  icon: React.ComponentType<{ className?: string }>;
  translationKey: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: {
    translationKey: 'status.draft',
    variant: 'outline',
    colorClass: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: FileEdit,
  },
  IN_PRODUCTION: {
    translationKey: 'status.in_production',
    variant: 'default',
    colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Hammer,
  },
  QC_PENDING: {
    translationKey: 'status.qc_pending',
    variant: 'secondary',
    colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: ClipboardCheck,
  },
  QC_APPROVED: {
    translationKey: 'status.qc_approved',
    variant: 'default',
    colorClass: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle2,
  },
  QC_REJECTED: {
    translationKey: 'status.qc_rejected',
    variant: 'destructive',
    colorClass: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
  },
  DELIVERED: {
    translationKey: 'status.delivered',
    variant: 'default',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Package,
  },
  CANCELLED: {
    translationKey: 'status.cancelled',
    variant: 'outline',
    colorClass: 'bg-gray-200 text-gray-600 border-gray-400',
    icon: Ban,
  },
  VOIDED: {
    translationKey: 'status.cancelled',
    variant: 'destructive',
    colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
  },
};

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    badge: 'text-xs px-2 py-0.5',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'text-sm px-2.5 py-1',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    badge: 'text-base px-3 py-1.5',
    icon: 'h-4 w-4',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorksheetStatusBadge({
  status,
  size = 'md',
  className,
  showIcon = true,
}: WorksheetStatusBadgeProps) {
  const t = useTranslations();

  // Get configuration for this status
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const sizeConfig = SIZE_CONFIG[size];

  const Icon = config.icon;
  const label = t(config.translationKey);

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        config.colorClass,
        sizeConfig.badge,
        className
      )}
      title={label}
    >
      {showIcon && <Icon className={sizeConfig.icon} />}
      {label}
    </Badge>
  );
}

/**
 * Get status label without rendering badge
 * Returns the translation key that can be used with t()
 */
export function getStatusLabel(status: WorksheetStatus | string): string {
  return STATUS_CONFIG[status]?.translationKey || status;
}

/**
 * Get status description
 * Returns a simple description string (status name formatted)
 */
export function getStatusDescription(status: WorksheetStatus | string): string {
  // Format the status key into a readable description
  const config = STATUS_CONFIG[status];
  if (!config) return 'Unknown status';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: WorksheetStatus | string): string {
  return STATUS_CONFIG[status]?.colorClass || STATUS_CONFIG.DRAFT.colorClass;
}
