/**
 * Quality Control Dashboard Page
 *
 * Lists all worksheets pending QC inspection
 * Role-based access: QC_INSPECTOR, ADMIN only
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QCDashboard } from '@/src/components/quality-control/QCDashboard';

export const metadata: Metadata = {
  title: 'Quality Control Dashboard | Smilelab MDR',
  description: 'Quality control inspection dashboard',
};

/**
 * Fetch worksheets pending QC inspection
 */
async function getQCPendingWorksheets() {
  const worksheets = await prisma.workSheet.findMany({
    where: {
      status: 'QC_PENDING',
      deletedAt: null,
    },
    include: {
      order: {
        include: {
          dentist: {
            select: {
              id: true,
              dentistName: true,
              clinicName: true,
            },
          },
        },
      },
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      },
      materials: {
        include: {
          material: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          materialLot: {
            select: {
              id: true,
              lotNumber: true,
            },
          },
        },
      },
      qualityControls: {
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc', // Oldest first (FIFO)
    },
  });

  // Convert Decimal fields to numbers for client component
  return worksheets.map(worksheet => ({
    ...worksheet,
    products: worksheet.products.map(p => ({
      ...p,
      priceAtSelection: Number(p.priceAtSelection),
    })),
    materials: worksheet.materials.map(m => ({
      ...m,
      quantityPlanned: Number(m.quantityPlanned || 0),
    })),
  }));
}

/**
 * Fetch QC approved/completed worksheets with documents
 * Includes all worksheets that have passed through QC inspection
 */
async function getQCCompletedWorksheets() {
  const worksheets = await prisma.workSheet.findMany({
    where: {
      status: {
        in: ['QC_APPROVED', 'QC_REJECTED', 'DELIVERED'],
      },
      deletedAt: null,
    },
    include: {
      order: {
        include: {
          dentist: {
            select: {
              id: true,
              dentistName: true,
              clinicName: true,
              email: true,
            },
          },
        },
      },
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      },
      materials: {
        include: {
          material: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          materialLot: {
            select: {
              id: true,
              lotNumber: true,
            },
          },
        },
      },
      qualityControls: {
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          inspectionDate: 'desc',
        },
        take: 1,
      },
      documents: {
        where: {
          type: 'ANNEX_XIII',
        },
        select: {
          id: true,
          type: true,
          documentNumber: true,
          generatedAt: true,
          retentionUntil: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc', // Most recently updated first
    },
    take: 50, // Limit to last 50 completed worksheets
  });

  // Convert Decimal fields to numbers for client component
  return worksheets.map(worksheet => ({
    ...worksheet,
    products: worksheet.products.map(p => ({
      ...p,
      priceAtSelection: Number(p.priceAtSelection),
    })),
    materials: worksheet.materials,
  }));
}

/**
 * Fetch QC statistics
 */
async function getQCStatistics() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    totalInspections,
    pendingInspections,
    todayInspections,
    approvedCount,
    rejectedCount,
    conditionalCount,
  ] = await Promise.all([
    prisma.qualityControl.count(),
    prisma.qualityControl.count({
      where: { result: 'PENDING' },
    }),
    prisma.qualityControl.count({
      where: {
        inspectionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
    prisma.qualityControl.count({
      where: { result: 'APPROVED' },
    }),
    prisma.qualityControl.count({
      where: { result: 'REJECTED' },
    }),
    prisma.qualityControl.count({
      where: { result: 'CONDITIONAL' },
    }),
  ]);

  const completedInspections = approvedCount + rejectedCount + conditionalCount;
  const approvalRate =
    completedInspections > 0
      ? Math.round(((approvedCount + conditionalCount) / completedInspections) * 100)
      : 0;

  return {
    totalInspections,
    pendingInspections,
    todayInspections,
    approvedCount,
    rejectedCount,
    conditionalCount,
    approvalRate,
  };
}

/**
 * Quality Control Dashboard Page
 */
export default async function QualityControlPage() {
  const t = await getTranslations();

  // Check authentication and role
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and TECHNICIAN can access QC dashboard
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  // Fetch data
  const [worksheets, completedWorksheets, statistics] = await Promise.all([
    getQCPendingWorksheets(),
    getQCCompletedWorksheets(),
    getQCStatistics(),
  ]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('qualityControl.dashboardTitle')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('qualityControl.dashboardSubtitle')}
        </p>
      </div>

      <QCDashboard
        worksheets={worksheets}
        completedWorksheets={completedWorksheets}
        statistics={statistics}
        userRole={session.user.role}
      />
    </div>
  );
}
