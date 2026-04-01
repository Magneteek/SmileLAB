/**
 * QC Completed Page Component
 *
 * Full-featured page for browsing, filtering, and bulk-downloading
 * Annex XIII MDR documents for all QC-completed worksheets.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Search,
  ArrowUpDown,
  Eye,
  Download,
  FileText,
  XCircle,
  FolderDown,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CompletedWorksheet {
  id: string;
  worksheetNumber: string;
  status: string;
  patientName: string | null;
  createdAt: Date;
  order: {
    id: string;
    orderNumber: string;
    dentist: {
      id: string;
      dentistName: string;
      clinicName: string | null;
      email: string | null;
    };
  };
  qualityControls: Array<{
    id: string;
    result: string;
    inspectionDate: Date;
    inspector: { id: string; name: string };
  }>;
  documents: Array<{
    id: string;
    type: string;
    documentNumber: string;
    generatedAt: Date;
    retentionUntil: Date;
  }>;
}

interface QCCompletedPageProps {
  completedWorksheets: CompletedWorksheet[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QCCompletedPage({ completedWorksheets }: QCCompletedPageProps) {
  const [search, setSearch] = useState('');
  const [dentistFilter, setDentistFilter] = useState<string>('all');
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const pageSize = 20;

  // ── Derived: unique dentist list ──────────────────────────────────────────
  const dentistOptions = Array.from(
    new Map(completedWorksheets.map(w => [w.order.dentist.id, w.order.dentist])).values()
  ).sort((a, b) =>
    (a.clinicName || a.dentistName).localeCompare(b.clinicName || b.dentistName)
  );

  // ── Derived: filtered + sorted list ──────────────────────────────────────
  const filtered = completedWorksheets
    .filter(w => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        w.worksheetNumber.toLowerCase().includes(q) ||
        w.order.orderNumber.toLowerCase().includes(q) ||
        (w.patientName?.toLowerCase().includes(q) ?? false) ||
        w.order.dentist.dentistName.toLowerCase().includes(q) ||
        (w.order.dentist.clinicName?.toLowerCase().includes(q) ?? false) ||
        w.documents.some(d => d.documentNumber.toLowerCase().includes(q));
      const matchesDentist =
        dentistFilter === 'all' || w.order.dentist.id === dentistFilter;
      return matchesSearch && matchesDentist;
    })
    .sort((a, b) => {
      const dateA = new Date(a.qualityControls[0]?.inspectionDate ?? a.createdAt).getTime();
      const dateB = new Date(b.qualityControls[0]?.inspectionDate ?? b.createdAt).getTime();
      if (sort === 'date_desc') return dateB - dateA;
      if (sort === 'date_asc') return dateA - dateB;
      if (sort === 'name_asc') return a.worksheetNumber.localeCompare(b.worksheetNumber);
      return b.worksheetNumber.localeCompare(a.worksheetNumber);
    });

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIdx, startIdx + pageSize);

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleDentist = (v: string) => { setDentistFilter(v); setPage(1); };
  const handleSort = (v: string) => { setSort(v as typeof sort); setPage(1); };

  // ── Select / download logic ───────────────────────────────────────────────
  const selectableIds = paginatedRows
    .filter(w => w.documents.some(d => d.type === 'ANNEX_XIII'))
    .map(w => w.id);

  const allSelected =
    selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
  const someSelected = selectableIds.some(id => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...selectableIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const downloadSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsDownloading(true);
    for (let i = 0; i < ids.length; i++) {
      const a = document.createElement('a');
      a.href = `/api/documents/annex-xiii/${ids[i]}`;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 400));
    }
    setIsDownloading(false);
  };

  // Count of selected IDs that are actually selectable (have annexDoc)
  const selectedCount = [...selectedIds].filter(id =>
    paginatedRows.some(w => w.id === id && w.documents.some(d => d.type === 'ANNEX_XIII'))
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground -ml-2">
              <Link href="/quality-control">
                <ArrowLeft className="h-4 w-4" />
                Nazaj
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Zaključeni QC pregledi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vsi delovni nalogi, ki so prestali pregled kakovosti
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>{filtered.length} zaključenih</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Išči po DN številki, pacientu, zobozdravniku..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={dentistFilter} onValueChange={handleDentist}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Vsi zobozdravniki" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi zobozdravniki</SelectItem>
            {dentistOptions.map(d => (
              <SelectItem key={d.id} value={d.id}>
                {d.clinicName || d.dentistName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={handleSort}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Datum ↓</SelectItem>
            <SelectItem value="date_asc">Datum ↑</SelectItem>
            <SelectItem value="name_asc">DN številka ↑</SelectItem>
            <SelectItem value="name_desc">DN številka ↓</SelectItem>
          </SelectContent>
        </Select>

        {someSelected && (
          <Button
            size="sm"
            onClick={downloadSelected}
            disabled={isDownloading}
            className="gap-2"
          >
            <FolderDown className="h-4 w-4" />
            {isDownloading
              ? 'Prenašam...'
              : `Prenesi izbrane (${selectedCount})`}
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-md">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Ni zaključenih pregledov</p>
          <p className="text-sm">Zaključeni QC pregledi se bodo prikazali tukaj.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Izberi vse"
                    data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                  />
                </TableHead>
                <TableHead>DN številka</TableHead>
                <TableHead>Zobozdravnik</TableHead>
                <TableHead>Pacient</TableHead>
                <TableHead>QC rezultat</TableHead>
                <TableHead>Inšpektor</TableHead>
                <TableHead>Datum pregleda</TableHead>
                <TableHead>MDR dokument</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map(worksheet => {
                const qcRecord = worksheet.qualityControls[0];
                const annexDoc = worksheet.documents.find(d => d.type === 'ANNEX_XIII');

                return (
                  <TableRow
                    key={worksheet.id}
                    className={selectedIds.has(worksheet.id) ? 'bg-blue-50' : ''}
                  >
                    {/* Checkbox */}
                    <TableCell className="w-10">
                      {annexDoc ? (
                        <Checkbox
                          checked={selectedIds.has(worksheet.id)}
                          onCheckedChange={() => toggleOne(worksheet.id)}
                          aria-label={`Izberi ${worksheet.worksheetNumber}`}
                        />
                      ) : null}
                    </TableCell>

                    {/* DN številka */}
                    <TableCell className="font-medium">
                      <Link
                        href={`/worksheets/${worksheet.id}`}
                        className="hover:underline text-blue-600"
                      >
                        {worksheet.worksheetNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        #{worksheet.order.orderNumber}
                      </div>
                    </TableCell>

                    {/* Zobozdravnik */}
                    <TableCell>
                      <div className="font-medium">{worksheet.order.dentist.dentistName}</div>
                      {worksheet.order.dentist.clinicName && (
                        <div className="text-sm text-muted-foreground">
                          {worksheet.order.dentist.clinicName}
                        </div>
                      )}
                    </TableCell>

                    {/* Pacient */}
                    <TableCell>
                      {worksheet.patientName || (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>

                    {/* QC rezultat */}
                    <TableCell>
                      {qcRecord ? (
                        <Badge
                          variant={
                            qcRecord.result === 'APPROVED'
                              ? 'default'
                              : qcRecord.result === 'CONDITIONAL'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={
                            qcRecord.result === 'APPROVED'
                              ? 'bg-green-500 hover:bg-green-600'
                              : qcRecord.result === 'CONDITIONAL'
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : ''
                          }
                        >
                          {qcRecord.result === 'APPROVED'
                            ? 'Odobreno'
                            : qcRecord.result === 'REJECTED'
                            ? 'Zavrnjeno'
                            : qcRecord.result === 'CONDITIONAL'
                            ? 'Pogojno'
                            : qcRecord.result}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>

                    {/* Inšpektor */}
                    <TableCell>
                      {qcRecord ? (
                        <span className="text-sm">{qcRecord.inspector.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>

                    {/* Datum pregleda */}
                    <TableCell>
                      {qcRecord ? (
                        <div className="text-sm">
                          {format(new Date(qcRecord.inspectionDate), 'dd. MM. yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(qcRecord.inspectionDate), 'HH:mm')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>

                    {/* MDR dokument */}
                    <TableCell>
                      {annexDoc ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm font-semibold text-green-600">
                              {annexDoc.documentNumber}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-5">Annex XIII</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Ni dokumenta</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Akcije */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/worksheets/${worksheet.id}`}>Poglej</Link>
                        </Button>
                        {annexDoc && (
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={`/api/documents/annex-xiii/${worksheet.id}?view=true`}
                                target="_blank"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/api/documents/annex-xiii/${worksheet.id}`}>
                                <Download className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Prikazujem {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} od{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prejšnja
            </Button>
            <span className="px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Naslednja
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
