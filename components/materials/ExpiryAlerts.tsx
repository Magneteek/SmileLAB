'use client';

// Expiry Alerts Dashboard Widget
// Shows materials expiring soon with color-coded severity

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExpiryAlert } from '@/types/material';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface ExpiryAlertsProps {
  daysThreshold?: number;
  maxDisplay?: number;
}

export function ExpiryAlerts({ daysThreshold = 30, maxDisplay = 5 }: ExpiryAlertsProps) {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [daysThreshold]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materials/alerts/expiring?days=${daysThreshold}`);

      if (!response.ok) {
        throw new Error('Failed to fetch expiry alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching expiry alerts:', err);
      setError('Failed to load expiry alerts');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: 'critical' | 'warning' | 'info'): string => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[severity];
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    if (severity === 'critical') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const displayAlerts = alerts.slice(0, maxDisplay);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Expiry Alerts
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
            <Package className="h-5 w-5" />
            Expiry Alerts
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
            No materials expiring within {daysThreshold} days
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <Link
                key={alert.materialLotId}
                href={`/materials/${alert.materialId}`}
                className="block"
              >
                <div
                  className={`p-3 rounded-lg border-2 hover:shadow-md transition-shadow ${getSeverityColor(
                    alert.severity
                  )}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityIcon(alert.severity)}
                        <span className="font-semibold text-sm">
                          {alert.materialCode} - {alert.materialName}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>LOT: {alert.lotNumber}</div>
                        <div>
                          Expires: {format(new Date(alert.expiryDate), 'MMM dd, yyyy')}
                        </div>
                        <div>
                          Quantity: {alert.quantityAvailable.toFixed(2)} remaining
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {alert.daysUntilExpiry}d
                    </Badge>
                  </div>
                </div>
              </Link>
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
