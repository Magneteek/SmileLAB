/**
 * Edit Worksheet Page
 *
 * Edit an existing worksheet (DRAFT status only). Displays the WorksheetForm
 * component in edit mode with all existing data pre-populated.
 *
 * Route: /worksheets/[id]/edit
 */

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorksheetForm } from '@/src/components/worksheets/WorksheetForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { WorksheetWithRelations } from '@/src/types/worksheet';

export default function EditWorksheetPage() {
  const router = useRouter();
  const params = useParams();
  const worksheetId = params.id as string;

  const [worksheet, setWorksheet] = useState<WorksheetWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch worksheet data
  useEffect(() => {
    const fetchWorksheet = async () => {
      try {
        const response = await fetch(`/api/worksheets/${worksheetId}`);

        if (!response.ok) {
          throw new Error('Failed to load worksheet');
        }

        const result = await response.json();
        const data = result.data;

        // Check if worksheet can be edited (DRAFT only)
        if (data.status !== 'DRAFT') {
          setError(
            `Cannot edit worksheet in ${data.status} status. Only DRAFT worksheets can be edited.`
          );
          return;
        }

        setWorksheet(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load worksheet');
      } finally {
        setIsLoading(false);
      }
    };

    if (worksheetId) {
      fetchWorksheet();
    }
  }, [worksheetId]);

  const handleSuccess = () => {
    // Stay on edit page and reload data
    // This allows iterative editing without leaving the page
    const fetchWorksheet = async () => {
      try {
        const response = await fetch(`/api/worksheets/${worksheetId}`);
        if (response.ok) {
          const result = await response.json();
          setWorksheet(result.data);
        }
      } catch (err) {
        console.error('Failed to reload worksheet:', err);
      }
    };
    fetchWorksheet();
  };

  const handleCancel = () => {
    // Go back to worksheet detail page
    router.push(`/worksheets/${worksheetId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Worksheet</h1>
          {worksheet && (
            <p className="text-gray-600 mt-1">
              {worksheet.worksheetNumber} • Order #{worksheet.order.orderNumber}
              {worksheet.patientName && ` • Patient: ${worksheet.patientName}`}
              {worksheet.order.orderDate && ` • Date: ${new Date(worksheet.order.orderDate).toLocaleDateString('sl-SI', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}`}
            </p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Loading worksheet...</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Link href={`/worksheets/${worksheetId}`}>
                <Button variant="outline" size="sm">
                  Back to Worksheet
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Worksheet Form */}
      {worksheet && !error && !isLoading && (
        <WorksheetForm
          mode="edit"
          worksheet={worksheet}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
