/**
 * QC Completed Worksheets Page
 *
 * Displays all worksheets that have been through QC inspection with
 * full filtering, sorting, pagination and bulk Annex XIII download.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QCCompletedPage } from '@/src/components/quality-control/QCCompletedPage';

/**
 * Fetch all QC-completed worksheets (no row limit).
 */
async function getCompletedWorksheets() {
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
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Convert Decimal fields to numbers for client component serialisation
  return worksheets.map(worksheet => ({
    ...worksheet,
    // No Decimal fields on these specific relations, but keep pattern consistent
  }));
}

export default async function QCCompletedPageRoute() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (!['ADMIN', 'TECHNICIAN', 'QC_INSPECTOR'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const worksheets = await getCompletedWorksheets();

  return (
    <div className="container mx-auto p-6 space-y-2">
      <QCCompletedPage completedWorksheets={worksheets} />
    </div>
  );
}
