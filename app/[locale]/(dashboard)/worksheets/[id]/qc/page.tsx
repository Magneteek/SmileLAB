/**
 * Quality Control Inspection Page
 *
 * Allows QC inspectors to review and approve/reject worksheets
 * Route: /worksheets/:id/qc
 */

import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QCInspectionForm } from '@/src/components/quality-control/QCInspectionForm';

export const metadata: Metadata = {
  title: 'Quality Control Inspection | Smilelab MDR',
  description: 'Inspect and approve worksheet quality',
};

/**
 * Fetch worksheet for QC inspection with all related data
 */
async function getWorksheetForQC(id: string) {
  const worksheet = await prisma.workSheet.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          dentist: {
            select: {
              id: true,
              dentistName: true,
              clinicName: true,
              licenseNumber: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      teeth: true,
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              code: true,
            },
          },
          productMaterials: {
            include: {
              material: true,
              materialLot: true,
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
              code: true,
              manufacturer: true,
            },
          },
          materialLot: {
            select: {
              id: true,
              lotNumber: true,
              expiryDate: true,
              arrivalDate: true,
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
              email: true,
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
  });

  // Convert Decimal fields to numbers for client component
  if (worksheet) {
    return {
      ...worksheet,
      products: worksheet.products.map(p => ({
        ...p,
        priceAtSelection: Number(p.priceAtSelection),
        productMaterials: p.productMaterials?.map(pm => ({
          ...pm,
          quantityUsed: Number(pm.quantityUsed),
          materialLot: pm.materialLot ? {
            ...pm.materialLot,
            quantityReceived: Number(pm.materialLot.quantityReceived),
            quantityAvailable: Number(pm.materialLot.quantityAvailable),
          } : null,
        })) || [],
      })),
      materials: worksheet.materials.map(m => ({
        ...m,
        quantityPlanned: Number(m.quantityPlanned || 0),
        materialLot: m.materialLot ? {
          ...m.materialLot,
          quantityReceived: Number(m.materialLot.quantityReceived),
          quantityAvailable: Number(m.materialLot.quantityAvailable),
        } : null,
      })),
    };
  }

  return worksheet;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Quality Control Inspection Page
 */
export default async function QCInspectionPage({ params }: PageProps) {
  // Check authentication and role
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and TECHNICIAN can access QC inspection
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;

  // Fetch worksheet
  const worksheet = await getWorksheetForQC(id);

  if (!worksheet || worksheet.deletedAt) {
    notFound();
  }

  // Check if worksheet is in QC_PENDING status
  if (worksheet.status !== 'QC_PENDING') {
    // If already inspected or not ready, redirect to worksheet detail
    redirect(`/worksheets/${id}?error=not-pending-qc`);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Quality Control Inspection - {worksheet.worksheetNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve worksheet before invoicing
          </p>
        </div>
      </div>

      <QCInspectionForm
        worksheet={worksheet}
        inspectorId={session.user.id}
        inspectorName={session.user.name}
      />
    </div>
  );
}
