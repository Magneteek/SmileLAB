'use client';

import { useEffect, useState } from 'react';
import { TraceabilityData } from '@/types/material';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { FileSearch, ArrowRight, User, Building, Loader2 } from 'lucide-react';

interface TraceabilityViewProps {
  lotNumber: string;
}

export function TraceabilityView({ lotNumber }: TraceabilityViewProps) {
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTraceability();
  }, [lotNumber]);

  const fetchTraceability = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/materials/traceability/${lotNumber}`);

      if (!response.ok) {
        throw new Error('Failed to fetch traceability data');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching traceability:', error);
      setError(error instanceof Error ? error.message : 'Failed to load traceability data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading traceability data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No traceability data found for LOT {lotNumber}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LOT Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            LOT Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">LOT Number:</span>
              <p className="font-semibold">{data.lot.lotNumber}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Material:</span>
              <p className="font-semibold">{data.lot.material.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Arrival Date:</span>
              <p>{format(new Date(data.lot.arrivalDate), 'PPP')}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Supplier:</span>
              <p>{data.lot.supplierName}</p>
            </div>
            {data.lot.expiryDate && (
              <div>
                <span className="text-sm text-muted-foreground">Expiry Date:</span>
                <p>{format(new Date(data.lot.expiryDate), 'PPP')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Used</p>
              <p className="text-2xl font-bold">{data.summary.totalQuantityUsed.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Worksheets</p>
              <p className="text-2xl font-bold">{data.summary.worksheetsCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patients</p>
              <p className="text-2xl font-bold">{data.summary.patientsAffected}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forward Traceability Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Forward Traceability (LOT → Devices → Patients)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.forwardTrace.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              This LOT has not been used in any devices yet.
            </p>
          ) : (
            <div className="space-y-4">
              {data.forwardTrace.map((trace, index) => (
                <div key={trace.worksheetId}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start gap-4">
                    <ArrowRight className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge className="mb-2">{trace.worksheetNumber}</Badge>
                          <p className="text-sm">
                            Manufactured: {trace.manufactureDate
                              ? format(new Date(trace.manufactureDate), 'PPP')
                              : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {trace.quantityUsed.toFixed(2)} used
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-medium">{trace.dentist.clinicName}</p>
                            <p className="text-muted-foreground">{trace.dentist.dentistName}</p>
                          </div>
                        </div>
                        {trace.patient && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p>
                              {trace.patient.firstName} {trace.patient.lastName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
