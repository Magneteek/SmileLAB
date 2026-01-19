'use client';

/**
 * Quality Control Inspection Page
 *
 * Allows QC inspectors to review and approve/reject worksheets
 * Route: /worksheets/:id/qc
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { QCInspectionForm } from '@/src/components/quality-control/QCInspectionForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Quality Control Inspection Page
 */
export default function QCInspectionPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const t = useTranslations('qualityControl');
  const [worksheetId, setWorksheetId] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setWorksheetId(p.id));
  }, [params]);

  // Check authentication and role
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Only ADMIN and TECHNICIAN can access QC inspection
    if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      router.push('/dashboard');
    }
  }, [session, sessionStatus, router]);

  // Fetch worksheet data
  useEffect(() => {
    if (!worksheetId || !session) return;

    async function fetchWorksheet() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/worksheets/${worksheetId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Worksheet not found');
          }
          throw new Error('Failed to fetch worksheet');
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Check if worksheet is in QC_PENDING status
          if (data.data.status !== 'QC_PENDING') {
            router.push(`/worksheets/${worksheetId}?error=not-pending-qc`);
            return;
          }

          setWorksheet(data.data);
        } else {
          throw new Error(data.error || 'Failed to load worksheet');
        }
      } catch (err) {
        console.error('Error fetching worksheet:', err);
        setError(err instanceof Error ? err.message : 'Failed to load worksheet');
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorksheet();
  }, [worksheetId, session, router]);

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error || !worksheet) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground mt-2">{error || 'Worksheet not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold">
            {t('inspectionPageTitle')} - {worksheet.worksheetNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('inspectionPageDescription')}
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
