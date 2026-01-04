/**
 * Worksheet History Component
 *
 * Displays complete edit history with audit trail
 * Shows: what changed, when, by whom, and why
 */

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { History, User, Calendar, FileEdit, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

interface StateTransitionEntry {
  id: string;
  action: 'STATE_TRANSITION';
  user: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string;
  changes: FieldChange[];
}

interface EditHistoryEntry {
  id: string;
  action: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  timestamp: Date;
  changes: FieldChange[];
  reasonForChange: string | null;
}

type HistoryEntry = StateTransitionEntry | EditHistoryEntry;

interface WorksheetHistoryProps {
  worksheetId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Format value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return format(new Date(value), 'MMM dd, yyyy');
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return format(new Date(value), 'MMM dd, yyyy');
  }
  return String(value);
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get action badge variant
 */
function getActionVariant(action: string): 'default' | 'secondary' | 'destructive' {
  switch (action) {
    case 'CREATE':
      return 'default';
    case 'UPDATE':
      return 'secondary';
    case 'DELETE':
      return 'destructive';
    case 'STATE_TRANSITION':
      return 'default';
    default:
      return 'secondary';
  }
}

/**
 * Check if entry is a state transition
 */
function isStateTransition(entry: HistoryEntry): entry is StateTransitionEntry {
  return entry.action === 'STATE_TRANSITION';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorksheetHistory({ worksheetId }: WorksheetHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const response = await fetch(`/api/worksheets/${worksheetId}/edit`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load history (${response.status})`);
        }

        const data = await response.json();
        setHistory(data.data?.history || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [worksheetId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit History</CardTitle>
          <CardDescription>Loading edit history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit History</CardTitle>
          <CardDescription>No edit history available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No changes have been made to this worksheet yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Edit History
        </CardTitle>
        <CardDescription>
          Complete audit trail of all changes ({history.length} {history.length === 1 ? 'entry' : 'entries'})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div
              key={entry.id}
              className="border-l-2 border-muted pl-4 pb-4 last:pb-0 relative"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />

              {/* Entry header */}
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionVariant(entry.action)}>
                      {entry.action === 'STATE_TRANSITION' ? 'STATUS CHANGE' : entry.action}
                    </Badge>
                    <span className="text-sm font-medium">{entry.user.name}</span>
                    {!isStateTransition(entry) && entry.user.role && (
                      <span className="text-xs text-muted-foreground">
                        ({entry.user.role})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </div>
                </div>
              </div>

              {/* State Transition Display */}
              {isStateTransition(entry) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status changed from</span>
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {entry.fromStatus ? formatStatus(entry.fromStatus) : 'Unknown'}
                    </Badge>
                    <span className="text-muted-foreground">to</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {entry.toStatus ? formatStatus(entry.toStatus) : 'Unknown'}
                    </Badge>
                  </div>
                  {entry.reason && (
                    <div className="p-2 bg-muted rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Notes:
                      </div>
                      <div className="text-sm">{entry.reason}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Field Edit Display */}
              {!isStateTransition(entry) && (
                <>
                  {/* Reason for change */}
                  {entry.reasonForChange && (
                    <div className="mb-2 p-2 bg-muted rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Reason for Change:
                      </div>
                      <div className="text-sm">{entry.reasonForChange}</div>
                    </div>
                  )}

                  {/* Field changes */}
                  {entry.changes && entry.changes.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Changes:
                      </div>
                      <div className="space-y-1">
                        {entry.changes.map((change, changeIndex) => (
                          <div
                            key={changeIndex}
                            className="text-sm grid grid-cols-[120px_1fr] gap-2 items-start"
                          >
                            <span className="font-medium text-muted-foreground">
                              {formatFieldName(change.field)}:
                            </span>
                            <div className="space-y-1">
                              {change.oldValue !== undefined && (
                                <div className="text-destructive line-through">
                                  {formatValue(change.oldValue)}
                                </div>
                              )}
                              <div className="text-green-600 font-medium">
                                {formatValue(change.newValue)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show simple message for CREATE actions */}
                  {entry.action === 'CREATE' && (!entry.changes || entry.changes.length === 0) && (
                    <div className="text-sm text-muted-foreground">
                      Worksheet created
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
