/**
 * Authentication Utilities
 *
 * Password hashing and permission checking functions
 */

import { hash, compare } from 'bcryptjs';
import { Role } from '@prisma/client';

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * Role hierarchy for permission checking
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  INVOICING: 3,
  QC_INSPECTOR: 2,
  TECHNICIAN: 1,
};

/**
 * Check if a user has sufficient role permissions
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user has permission for specific actions
 */
export const permissions = {
  // User Management
  canManageUsers: (role: Role) => role === 'ADMIN',

  // Orders
  canCreateOrders: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canViewOrders: (role: Role) => true, // All roles can view
  canEditOrders: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canDeleteOrders: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),

  // Worksheets
  canCreateWorksheets: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canViewWorksheets: (role: Role) => true,
  canEditWorksheets: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canDeleteWorksheets: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canAssignMaterials: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),

  // Quality Control
  canPerformQC: (role: Role) =>
    ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'].includes(role),
  canApproveQC: (role: Role) =>
    ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'].includes(role),
  canRejectQC: (role: Role) =>
    ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'].includes(role),

  // Invoicing
  canCreateInvoices: (role: Role) =>
    ['ADMIN', 'INVOICING'].includes(role),
  canViewInvoices: (role: Role) => true,
  canSendInvoices: (role: Role) =>
    ['ADMIN', 'INVOICING'].includes(role),
  canMarkPaid: (role: Role) =>
    ['ADMIN', 'INVOICING'].includes(role),

  // Documents (Annex XIII)
  canGenerateDocuments: (role: Role) =>
    ['ADMIN', 'QC_INSPECTOR', 'TECHNICIAN'].includes(role),
  canViewDocuments: (role: Role) => true,

  // Master Data
  canManageDentists: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canManageProducts: (role: Role) => role === 'ADMIN',
  canManageMaterials: (role: Role) => role === 'ADMIN',
  canManagePricing: (role: Role) => role === 'ADMIN',

  // Materials Inventory
  canRecordStockArrivals: (role: Role) =>
    ['ADMIN', 'TECHNICIAN'].includes(role),
  canViewInventory: (role: Role) => true,
};

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    ADMIN: 'Administrator',
    TECHNICIAN: 'Dental Technician',
    QC_INSPECTOR: 'Quality Control Inspector',
    INVOICING: 'Invoicing Specialist',
  };
  return displayNames[role];
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: Role): string {
  const colors: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    TECHNICIAN: 'bg-blue-100 text-blue-800',
    QC_INSPECTOR: 'bg-green-100 text-green-800',
    INVOICING: 'bg-orange-100 text-orange-800',
  };
  return colors[role];
}
