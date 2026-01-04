'use client';

// Low Stock Alerts Dashboard Widget
// Shows materials below threshold with percentage indicators

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LowStockAlert } from '@/types/material';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Package, ChevronRight, Plus } from 'lucide-react';
import { MATERIAL_TYPE_LABELS } from '@/types/material';

interface LowStockAlertsProps {
  threshold?: number;
  maxDisplay?: number;
}

export function LowStockAlerts({ threshold = 20, maxDisplay = 5 }: LowStockAlertsProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [threshold]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/alerts/low-stock?threshold=${threshold}`);

      if (!response.ok) {
        throw new Error('Failed to fetch low stock alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching low stock alerts:', err);
      setError('Failed to load low stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (percentage: number): string => {
    if (percentage < 25) return 'bg-red-100 text-red-800 border-red-300';
    if (percentage < 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage < 25) return 'bg-red-600';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  const displayAlerts = alerts.slice(0, maxDisplay);
  const criticalCount = alerts.filter((a) => a.percentageOfThreshold < 25).length;
  const warningCount = alerts.filter(
    (a) => a.percentageOfThreshold >= 25 && a.percentageOfThreshold < 50
  ).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Low Stock Alerts
          </div>
          {alerts.length > 0 && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-red-600">{criticalCount} Critical</Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-yellow-500">{warningCount} Warning</Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            All materials are sufficiently stocked
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <div
                key={alert.materialId}
                className={`p-3 rounded-lg border-2 ${getSeverityColor(
                  alert.percentageOfThreshold
                )}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">
                        {alert.materialCode} - {alert.materialName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {MATERIAL_TYPE_LABELS[alert.type]}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {alert.totalAvailableQuantity.toFixed(2)} {alert.unit}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Stock Level</span>
                      <span className="font-semibold">
                        {alert.percentageOfThreshold.toFixed(0)}% of threshold
                      </span>
                    </div>
                    <Progress
                      value={Math.min(alert.percentageOfThreshold, 100)}
                      className="h-2"
                      indicatorClassName={getProgressColor(alert.percentageOfThreshold)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/materials/${alert.materialId}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link
                      href={`/materials/${alert.materialId}/lots/new`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        <Plus className="mr-1 h-3 w-3" />
                        Record Arrival
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {alerts.length > maxDisplay && (
              <Link href="/materials/inventory">
                <Button variant="outline" className="w-full">
                  View All {alerts.length} Alerts
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
