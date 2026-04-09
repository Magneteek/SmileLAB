'use client';

/**
 * EmailLogTable
 *
 * Client-side filterable/searchable table for the global email log page.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface EmailLogDocument {
  document: {
    id: string;
    documentNumber: string;
    worksheetId: string | null;
  };
}

interface EmailLogEntry {
  id: string;
  recipient: string;
  subject: string;
  customNote: string | null;
  status: string;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  sentBy: { id: string; name: string };
  invoice: { id: string; invoiceNumber: string | null; totalAmount: number } | null;
  dentist: { id: string; dentistName: string; clinicName: string | null } | null;
  documents: EmailLogDocument[];
}

interface EmailLogTableProps {
  logs: EmailLogEntry[];
}

// ============================================================================
// HELPERS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  if (status === 'SENT') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        Poslano
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <XCircle className="h-3 w-3" />
        Napaka
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 gap-1">
      <Clock className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function AttachmentsSummary({ log }: { log: EmailLogEntry }) {
  const items: string[] = [];
  if (log.invoice?.invoiceNumber) items.push(log.invoice.invoiceNumber);
  log.documents.forEach(d => {
    if (d.document.documentNumber) items.push(d.document.documentNumber);
  });

  if (items.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="flex flex-col gap-0.5">
      {log.invoice?.invoiceNumber && (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Receipt className="h-3 w-3 shrink-0" />
          {log.invoice.invoiceNumber}
        </div>
      )}
      {log.documents.map(d => (
        <div key={d.document.id} className="flex items-center gap-1 text-xs text-green-600">
          <FileText className="h-3 w-3 shrink-0" />
          {d.document.documentNumber}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmailLogTable({ logs }: EmailLogTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        log.recipient.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q) ||
        log.dentist?.dentistName.toLowerCase().includes(q) ||
        log.dentist?.clinicName?.toLowerCase().includes(q) ||
        log.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
        log.documents.some(d => d.document.documentNumber.toLowerCase().includes(q)) ||
        log.sentBy.name.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const sentCount = logs.filter(l => l.status === 'SENT').length;
  const failedCount = logs.filter(l => l.status === 'FAILED').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold">{logs.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Skupaj poslano</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{sentCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Uspešno</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-500">{failedCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Napake</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dnevnik e-pošte</CardTitle>
          <CardDescription>{filtered.length} zapisov</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Išči po prejemniku, zobozdravniku, številki..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsi statusi</SelectItem>
                <SelectItem value="SENT">Poslano</SelectItem>
                <SelectItem value="FAILED">Napaka</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Prejemnik</TableHead>
                  <TableHead>Zobozdravnik</TableHead>
                  <TableHead>Priponke</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Poslal/a</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Mail className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Ni zapisov
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map(log => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {log.sentAt || log.failedAt
                            ? format(new Date(log.sentAt || log.failedAt!), 'dd.MM.yyyy HH:mm')
                            : format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm">{log.recipient}</TableCell>
                        <TableCell className="text-sm">
                          {log.dentist ? (
                            <div>
                              <div>{log.dentist.dentistName}</div>
                              {log.dentist.clinicName && (
                                <div className="text-xs text-muted-foreground">{log.dentist.clinicName}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AttachmentsSummary log={log} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.sentBy.name}</TableCell>
                        <TableCell>
                          {expandedId === log.id
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {expandedId === log.id && (
                        <TableRow key={`${log.id}-detail`} className="bg-muted/20">
                          <TableCell colSpan={7} className="py-3 px-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-xs text-muted-foreground mb-1">ZADEVA</div>
                                <div>{log.subject}</div>
                              </div>
                              {log.customNote && (
                                <div>
                                  <div className="font-medium text-xs text-muted-foreground mb-1">OPOMBA</div>
                                  <div className="whitespace-pre-wrap">{log.customNote}</div>
                                </div>
                              )}
                              {log.status === 'FAILED' && log.errorMessage && (
                                <div className="col-span-2">
                                  <div className="font-medium text-xs text-red-500 mb-1">NAPAKA</div>
                                  <div className="text-red-600 font-mono text-xs">{log.errorMessage}</div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-muted-foreground">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} od {filtered.length}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Nazaj
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Naprej
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
