'use client';

/**
 * Documents Widget
 *
 * Displays MDR compliance document status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentsOverview } from '@/lib/services/dashboard-service';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DocumentsWidgetProps {
  data: DocumentsOverview;
}

export function DocumentsWidget({ data }: DocumentsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">MDR Documents</CardTitle>
            <CardDescription>Compliance and retention status</CardDescription>
          </div>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold">{data.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Generated</p>
            <p className="text-2xl font-bold text-green-600">{data.generated}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Document Status
          </p>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Generated</span>
            </div>
            <Badge className="bg-green-500">{data.generated}</Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <Badge className="bg-blue-500">{data.pending}</Badge>
          </div>

          {data.retentionExpiring > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  Retention Expiring
                </span>
              </div>
              <Badge className="bg-yellow-500">{data.retentionExpiring}</Badge>
            </div>
          )}
        </div>

        {/* Compliance Info */}
        <div className="border-t pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-900">
              ℹ️ All documents retained for 10 years per EU MDR Annex XIII
            </p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        {data.total === 0 && (
          <div className="border-t pt-4">
            <div className="p-4 bg-gray-50 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                No documents generated yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Documents will appear after QC approval
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
