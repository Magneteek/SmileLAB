/**
 * Dashboard Service
 *
 * Aggregates statistics for the dashboard widgets
 */

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrdersOverview {
  total: number;
  pending: number;
  inProduction: number;
  qcPending: number;
  qcApproved: number;
  invoiced: number;
  delivered: number;
  cancelled: number;
}

export interface MaterialAlerts {
  totalMaterials: number;
  activeMaterials: number;
  lowStock: number;
  expiringSoon: number; // Expiring in next 30 days
  expired: number;
  reorderNeeded: number;
}

export interface QCStatusOverview {
  totalInspections: number;
  pendingInspections: number;
  passedInspections: number;
  failedInspections: number;
  todayInspections: number;
}

export interface InvoicesOverview {
  total: number;
  sent: number;
  paid: number;
  overdue: number;
  totalAmount: number; // ADMIN only
  paidAmount: number;  // ADMIN only
  overdueAmount: number; // ADMIN only
}

export interface DocumentsOverview {
  total: number;
  generated: number;
  pending: number;
  retentionExpiring: number;
}

export interface RecentActivity {
  id: string;
  type: 'ORDER' | 'WORKSHEET' | 'MATERIAL' | 'QC' | 'INVOICE' | 'DOCUMENT';
  action: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

export interface DashboardStats {
  orders: OrdersOverview;
  materials: MaterialAlerts;
  qc: QCStatusOverview;
  invoices?: InvoicesOverview; // Only for ADMIN
  documents: DocumentsOverview;
  recentActivity: RecentActivity[];
}

// ============================================================================
// ORDERS STATISTICS
// ============================================================================

export async function getOrdersOverview(): Promise<OrdersOverview> {
  const [total, statusCounts] = await Promise.all([
    prisma.order.count({
      where: { deletedAt: null },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  const stats: OrdersOverview = {
    total,
    pending: 0,
    inProduction: 0,
    qcPending: 0,
    qcApproved: 0,
    invoiced: 0,
    delivered: 0,
    cancelled: 0,
  };

  statusCounts.forEach((item) => {
    switch (item.status) {
      case OrderStatus.PENDING:
        stats.pending = item._count;
        break;
      case OrderStatus.IN_PRODUCTION:
        stats.inProduction = item._count;
        break;
      case OrderStatus.QC_PENDING:
        stats.qcPending = item._count;
        break;
      case OrderStatus.QC_APPROVED:
        stats.qcApproved = item._count;
        break;
      case OrderStatus.INVOICED:
        stats.invoiced = item._count;
        break;
      case OrderStatus.DELIVERED:
        stats.delivered = item._count;
        break;
      case OrderStatus.CANCELLED:
        stats.cancelled = item._count;
        break;
    }
  });

  return stats;
}

// ============================================================================
// MATERIALS STATISTICS
// ============================================================================

export async function getMaterialAlerts(): Promise<MaterialAlerts> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const [totalMaterials, activeMaterials, lots] = await Promise.all([
    prisma.material.count(),
    prisma.material.count({
      where: { active: true },
    }),
    prisma.materialLot.findMany({
      select: {
        id: true,
        quantityAvailable: true,
        expiryDate: true,
        status: true,
        material: {
          select: {
            active: true,
          },
        },
      },
    }),
  ]);

  let lowStock = 0;
  let expiringSoon = 0;
  let expired = 0;
  let reorderNeeded = 0;

  lots.forEach((lot) => {
    // Only count active materials
    if (!lot.material.active) return;

    // Check stock levels
    if (lot.quantityAvailable <= 0 || lot.status === 'DEPLETED') {
      lowStock++;
    } else if (lot.quantityAvailable < 100) {
      // Consider reorder needed if quantity is low
      reorderNeeded++;
    }

    // Check expiry
    if (lot.expiryDate) {
      if (lot.expiryDate < now) {
        expired++;
      } else if (lot.expiryDate <= thirtyDaysFromNow) {
        expiringSoon++;
      }
    }
  });

  return {
    totalMaterials,
    activeMaterials,
    lowStock,
    expiringSoon,
    expired,
    reorderNeeded,
  };
}

// ============================================================================
// QC STATISTICS
// ============================================================================

export async function getQCStatusOverview(): Promise<QCStatusOverview> {
  // For now, return placeholder data since QC system isn't fully implemented
  // This will be populated when QC features are implemented

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [total, todayCount] = await Promise.all([
    prisma.qualityControl.count(),
    prisma.qualityControl.count({
      where: {
        inspectionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
  ]);

  const resultCounts = await prisma.qualityControl.groupBy({
    by: ['result'],
    _count: true,
  });

  const stats: QCStatusOverview = {
    totalInspections: total,
    pendingInspections: 0,
    passedInspections: 0,
    failedInspections: 0,
    todayInspections: todayCount,
  };

  resultCounts.forEach((item) => {
    if (item.result === 'APPROVED' || item.result === 'CONDITIONAL') {
      stats.passedInspections += item._count;
    } else if (item.result === 'PENDING') {
      stats.pendingInspections = item._count;
    } else if (item.result === 'REJECTED') {
      stats.failedInspections += item._count;
    }
  });

  return stats;
}

// ============================================================================
// INVOICES STATISTICS (ADMIN ONLY)
// ============================================================================

export async function getInvoicesOverview(): Promise<InvoicesOverview> {
  const now = new Date();

  // Get all invoices with necessary fields
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      paymentStatus: true,
      totalAmount: true,
      dueDate: true,
    },
  });

  // Initialize stats
  const stats: InvoicesOverview = {
    total: invoices.length,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
  };

  // Calculate statistics
  invoices.forEach((invoice) => {
    // Add to total amount
    stats.totalAmount += invoice.totalAmount;

    // Count by payment status
    if (invoice.paymentStatus === 'SENT' || invoice.paymentStatus === 'VIEWED') {
      stats.sent++;
    } else if (invoice.paymentStatus === 'PAID') {
      stats.paid++;
      stats.paidAmount += invoice.totalAmount;
    }

    // Check if overdue (due date passed and not paid/cancelled)
    if (
      invoice.dueDate < now &&
      invoice.paymentStatus !== 'PAID' &&
      invoice.paymentStatus !== 'CANCELLED'
    ) {
      stats.overdue++;
      stats.overdueAmount += invoice.totalAmount;
    }
  });

  return stats;
}

// ============================================================================
// DOCUMENTS STATISTICS
// ============================================================================

export async function getDocumentsOverview(): Promise<DocumentsOverview> {
  const total = await prisma.document.count();

  // For now, return basic stats
  // Will be enhanced when document management is fully implemented
  return {
    total,
    generated: total,
    pending: 0,
    retentionExpiring: 0,
  };
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  // Get recent orders, worksheets, and materials changes
  const [recentOrders, recentWorksheets, recentMaterials] = await Promise.all([
    prisma.order.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.workSheet.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        worksheetNumber: true,
        createdAt: true,
        status: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.material.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        active: true,
      },
    }),
  ]);

  const activities: RecentActivity[] = [];

  // Add order activities
  recentOrders.forEach((order) => {
    activities.push({
      id: order.id,
      type: 'ORDER',
      action: 'created',
      description: `Order ${order.orderNumber} created`,
      timestamp: order.createdAt,
      userId: order.createdBy.id,
      userName: order.createdBy.name,
    });
  });

  // Add worksheet activities
  recentWorksheets.forEach((worksheet) => {
    activities.push({
      id: worksheet.id,
      type: 'WORKSHEET',
      action: 'created',
      description: `Worksheet ${worksheet.worksheetNumber} created`,
      timestamp: worksheet.createdAt,
      userId: worksheet.createdBy.id,
      userName: worksheet.createdBy.name,
    });
  });

  // Add material activities
  recentMaterials.forEach((material) => {
    activities.push({
      id: material.id,
      type: 'MATERIAL',
      action: 'created',
      description: `Material ${material.code} - ${material.name} added`,
      timestamp: material.createdAt,
      userId: 'system',
      userName: 'System',
    });
  });

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

// ============================================================================
// AGGREGATE ALL STATISTICS
// ============================================================================

export async function getDashboardStats(
  userRole: string
): Promise<DashboardStats> {
  const isAdmin = userRole === 'ADMIN';

  const [orders, materials, qc, documents, recentActivity] = await Promise.all([
    getOrdersOverview(),
    getMaterialAlerts(),
    getQCStatusOverview(),
    getDocumentsOverview(),
    getRecentActivity(10),
  ]);

  const stats: DashboardStats = {
    orders,
    materials,
    qc,
    documents,
    recentActivity,
  };

  // Only include invoices for ADMIN users
  if (isAdmin) {
    stats.invoices = await getInvoicesOverview();
  }

  return stats;
}
