'use client';

/**
 * EmailHistoryCard
 *
 * Compact email send history for order/invoice detail pages.
 * Fetches from /api/email/logs?invoiceId=xxx or ?worksheetId=xxx
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Mail, CheckCircle, XCircle, FileText, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmailLogEntry {
  id: string;
  recipient: string;
  subject: string;
  customNote: string | null;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentBy: { name: string };
  invoice: { invoiceNumber: string | null } | null;
  documents: Array<{ document: { documentNumber: string } }>;
}

interface EmailHistoryCardProps {
  invoiceId?: string;
  worksheetId?: string;
}

export function EmailHistoryCard({ invoiceId, worksheetId }: EmailHistoryCardProps) {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId && !worksheetId) return;

    const params = new URLSearchParams();
    if (invoiceId) params.set('invoiceId', invoiceId);
    else if (worksheetId) params.set('worksheetId', worksheetId);

    fetch(`/api/email/logs?${params}`)
      .then(r => r.json())
      .then(data => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [invoiceId, worksheetId]);

  if (loading) return null;
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Zgodovina e-pošte
          <Badge variant="secondary" className="ml-1 text-xs">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {logs.map(log => {
          const date = log.sentAt || log.failedAt || log.createdAt;
          const expanded = expandedId === log.id;

          return (
            <div
              key={log.id}
              className="border rounded-md overflow-hidden"
            >
              {/* Main row */}
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expanded ? null : log.id)}
              >
                {log.status === 'SENT' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{log.recipient}</span>
                    {/* Attachments inline */}
                    <div className="flex items-center gap-1.5">
                      {log.invoice?.invoiceNumber && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-blue-600">
                          <Receipt className="h-3 w-3" />{log.invoice.invoiceNumber}
                        </span>
                      )}
                      {log.documents.map(d => (
                        <span key={d.document.documentNumber} className="inline-flex items-center gap-0.5 text-xs text-green-600">
                          <FileText className="h-3 w-3" />{d.document.documentNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(date), 'dd.MM.yyyy HH:mm')} · {log.sentBy.name}
                  </div>
                </div>

                {expanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="border-t px-3 py-2 bg-muted/20 space-y-1.5 text-sm">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Zadeva:</span> {log.subject}
                  </div>
                  {log.customNote && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Opomba:</span> {log.customNote}
                    </div>
                  )}
                  {log.status === 'FAILED' && log.errorMessage && (
                    <div className="text-xs text-red-600">
                      <span className="font-medium">Napaka:</span> {log.errorMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
