'use client';

/**
 * Incoming Orders — Triage Inbox
 * Shows all DRAFT worksheets (unprocessed cases from any source).
 * Quick-add form creates an Order + Worksheet in one step.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Inbox, Plus, ExternalLink, CalendarIcon, Loader2,
  RefreshCw, Mail, HardDrive, Cloud, Scan, Package, ChevronRight,
  AlertCircle, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = 'MEDIT' | 'SHINING3D' | 'GOOGLE_DRIVE' | 'THREESHAPE' | 'EMAIL' | 'PHYSICAL';

interface IncomingWorksheet {
  id: string;
  worksheetNumber: string;
  patientName: string | null;
  scanSource: string | null;
  scanReference: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    dueDate: string | null;
    priority: number;
    impressionType: string;
    notes: string | null;
  };
  dentist: { id: string; dentistName: string; clinicName: string };
  products: Array<{ id: string; quantity: number; product: { name: string; code: string } }>;
}

interface OrderWithoutWorksheet {
  id: string;
  orderNumber: string;
  orderDate: string;
  dueDate: string | null;
  priority: number;
  impressionType: string;
  notes: string | null;
  patientName: string | null;
  createdAt: string;
  dentist: { id: string; dentistName: string; clinicName: string };
}

interface Dentist { id: string; dentistName: string; clinicName: string }

// ─── Source config ────────────────────────────────────────────────────────────

const SOURCES: { value: Source; label: string; icon: React.ElementType; color: string; badge: string } [] = [
  { value: 'MEDIT',        label: 'MeditLink',         icon: Scan,      color: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'SHINING3D',    label: 'Shining 3D',        icon: Scan,      color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'GOOGLE_DRIVE', label: 'Google Drive',      icon: Cloud,     color: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'THREESHAPE',   label: '3Shape',             icon: Scan,      color: 'text-green-600',  badge: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'EMAIL',        label: 'E-pošta / FilePort', icon: Mail,      color: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'PHYSICAL',     label: 'Fizično / Kurir',   icon: Package,   color: 'text-stone-600',  badge: 'bg-stone-100 text-stone-700 border-stone-200' },
];

function getSourceConfig(scanSource: string | null, impressionType: string) {
  if (scanSource) {
    const s = SOURCES.find((x) => x.value === scanSource);
    if (s) return s;
  }
  if (impressionType === 'PHYSICAL_IMPRINT') return SOURCES.find((x) => x.value === 'PHYSICAL')!;
  return SOURCES.find((x) => x.value === 'EMAIL')!;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function IncomingCard({ ws, locale }: { ws: IncomingWorksheet; locale: string }) {
  const t = useTranslations('incoming');
  const src = getSourceConfig(ws.scanSource, ws.order.impressionType);
  const SrcIcon = src.icon;
  const dueDate = ws.order.dueDate ? parseISO(ws.order.dueDate) : null;
  const overdue = dueDate && dueDate < new Date();

  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SrcIcon className={cn('h-4 w-4 flex-shrink-0', src.color)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/${locale}/worksheets/${ws.id}`}
                className="font-mono text-sm font-bold text-blue-600 hover:underline"
              >
                {ws.worksheetNumber}
              </Link>
              <Badge className={cn('text-[10px] px-1.5 py-0 border', src.badge)}>
                {src.label}
              </Badge>
              {ws.order.priority === 2 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1 py-0">{t('priorityUrgent')}</Badge>
              )}
              {ws.order.priority === 1 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1 py-0">{t('priorityHigh')}</Badge>
              )}
            </div>
            <p className="text-sm font-medium truncate mt-0.5">{ws.patientName || '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{ws.dentist.clinicName} · {ws.dentist.dentistName}</p>
          </div>
        </div>

        {/* Due date */}
        <div className="flex-shrink-0 text-right">
          {dueDate ? (
            <span className={cn(
              'text-xs font-medium flex items-center gap-1',
              overdue ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {overdue && <AlertCircle className="h-3 w-3" />}
              <CalendarIcon className="h-3 w-3" />
              {format(dueDate, 'd. M.')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t('noDueDate')}</span>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(parseISO(ws.createdAt), { addSuffix: true, locale: sl })}
          </p>
        </div>
      </div>

      {/* Scan reference */}
      {ws.scanReference && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HardDrive className="h-3 w-3 flex-shrink-0" />
          {ws.scanReference.startsWith('http') ? (
            <a href={ws.scanReference} target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-0.5 truncate max-w-[200px]">
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              {ws.scanReference}
            </a>
          ) : (
            <span className="truncate max-w-[200px]">{ws.scanReference}</span>
          )}
        </div>
      )}

      {/* Products */}
      {ws.products.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ws.products.map((p) => (
            <span key={p.id}
              className="text-[11px] bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 font-medium truncate max-w-[160px]"
              title={p.product.name}>
              {p.quantity > 1 ? `${p.quantity}× ` : ''}{p.product.name}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {ws.order.notes && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">{ws.order.notes}</p>
      )}

      {/* Action */}
      <div className="flex justify-end pt-0.5">
        <Link href={`/${locale}/worksheets/${ws.id}`}>
          <Button size="sm" className="h-7 text-xs gap-1">
            <ChevronRight className="h-3 w-3" />
            {t('openWorksheet')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ─── Order-only card (no worksheet yet) ──────────────────────────────────────

function OrderCard({ order, locale }: { order: OrderWithoutWorksheet; locale: string }) {
  const t = useTranslations('incoming');
  const dueDate = order.dueDate ? parseISO(order.dueDate) : null;
  const overdue = dueDate && dueDate < new Date();
  const src = order.impressionType === 'PHYSICAL_IMPRINT'
    ? SOURCES.find((x) => x.value === 'PHYSICAL')!
    : SOURCES.find((x) => x.value === 'EMAIL')!;
  const SrcIcon = src.icon;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow border-dashed">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SrcIcon className={cn('h-4 w-4 flex-shrink-0', src.color)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/${locale}/orders/${order.id}`}
                className="font-mono text-sm font-bold text-gray-700 hover:underline"
              >
                {order.orderNumber}
              </Link>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">{t('noWorksheet')}</Badge>
              {order.priority === 2 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1 py-0">{t('priorityUrgent')}</Badge>
              )}
              {order.priority === 1 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1 py-0">{t('priorityHigh')}</Badge>
              )}
            </div>
            <p className="text-sm font-medium truncate mt-0.5">{order.patientName || '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{order.dentist.clinicName} · {order.dentist.dentistName}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {dueDate ? (
            <span className={cn(
              'text-xs font-medium flex items-center gap-1',
              overdue ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {overdue && <AlertCircle className="h-3 w-3" />}
              <CalendarIcon className="h-3 w-3" />
              {format(dueDate, 'd. M.')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t('noDueDate')}</span>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(parseISO(order.createdAt), { addSuffix: true, locale: sl })}
          </p>
        </div>
      </div>

      {order.notes && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">{order.notes}</p>
      )}

      <div className="flex justify-end pt-0.5">
        <Link href={`/${locale}/worksheets/new?orderId=${order.id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            {t('createWorksheet')}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ─── Quick-add form ───────────────────────────────────────────────────────────

function QuickAddSheet({
  open, onClose, dentists, onCreated, locale,
}: {
  open: boolean;
  onClose: () => void;
  dentists: Dentist[];
  onCreated: () => void;
  locale: string;
}) {
  const t = useTranslations('incoming');
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const [form, setForm] = useState<{
    source: Source | '';
    scanReference: string;
    dentistId: string;
    patientName: string;
    dueDate: Date | undefined;
    priority: number;
    notes: string;
  }>({
    source: '',
    scanReference: '',
    dentistId: '',
    patientName: '',
    dueDate: undefined,
    priority: 0,
    notes: '',
  });

  const hasRef = form.source && ['MEDIT', 'SHINING3D', 'GOOGLE_DRIVE', 'THREESHAPE'].includes(form.source);

  const reset = () => setForm({
    source: '', scanReference: '', dentistId: '', patientName: '',
    dueDate: undefined, priority: 0, notes: '',
  });

  const handleSubmit = async () => {
    if (!form.source || !form.dentistId) {
      toast({ title: t('errorMissingData'), description: t('errorMissingDataDesc'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: form.source,
          scanReference: form.scanReference || null,
          dentistId: form.dentistId,
          patientName: form.patientName || null,
          dueDate: form.dueDate ? form.dueDate.toISOString() : null,
          priority: form.priority,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Napaka');
      const worksheetId = data.data.worksheet.id;
      const worksheetNumber = data.data.worksheet.worksheetNumber;
      toast({ title: t('successTitle'), description: t('successDesc', { worksheetNumber }) });
      reset();
      onCreated();
      onClose();
      window.location.href = `/${locale}/worksheets/${worksheetId}`;
    } catch (err: any) {
      toast({ title: t('errorTitle'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b mb-2">
          <SheetTitle>{t('sheetTitle')}</SheetTitle>
          <SheetDescription>{t('sheetDesc')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Source */}
          <div className="space-y-1.5">
            <Label>{t('sourceLabel')} <span className="text-red-500">*</span></Label>
            <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as Source }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('sourcePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference (only for digital sources) */}
          {hasRef && (
            <div className="space-y-1.5">
              <Label>{t('refLabel')}</Label>
              <Input
                placeholder={form.source === 'GOOGLE_DRIVE' ? t('refPlaceholderDrive') : t('refPlaceholderGeneric')}
                value={form.scanReference}
                onChange={(e) => setForm((f) => ({ ...f, scanReference: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('refHint')}</p>
            </div>
          )}

          {/* Dentist */}
          <div className="space-y-1.5">
            <Label>{t('dentistLabel')} <span className="text-red-500">*</span></Label>
            <Select value={form.dentistId} onValueChange={(v) => setForm((f) => ({ ...f, dentistId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('dentistPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.clinicName} — {d.dentistName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patient */}
          <div className="space-y-1.5">
            <Label>{t('patientLabel')}</Label>
            <Input
              placeholder={t('patientPlaceholder')}
              value={form.patientName}
              onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label>{t('dueDateLabel')}</Label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'inline-flex items-center w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    !form.dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.dueDate ? format(form.dueDate, 'd. M. yyyy') : t('dueDatePlaceholder')}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.dueDate}
                  onSelect={(d) => { setForm((f) => ({ ...f, dueDate: d as Date | undefined })); setDueDateOpen(false); }}
                  initialFocus
                />
                {form.dueDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground"
                      onClick={() => setForm((f) => ({ ...f, dueDate: undefined }))}>
                      {t('clearDate')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>{t('priorityLabel')}</Label>
            <Select
              value={String(form.priority)}
              onValueChange={(v) => setForm((f) => ({ ...f, priority: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('priorityNormal')}</SelectItem>
                <SelectItem value="1">{t('priorityHigh')}</SelectItem>
                <SelectItem value="2">{t('priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('notesLabel')}</Label>
            <Textarea
              placeholder={t('notesPlaceholder')}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              {t('cancelButton')}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {t('addButton')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncomingPage() {
  const locale = useLocale();
  const t = useTranslations('incoming');
  const { toast } = useToast();

  const [worksheets, setWorksheets] = useState<IncomingWorksheet[]>([]);
  const [ordersWithoutWorksheet, setOrdersWithoutWorksheet] = useState<OrderWithoutWorksheet[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'worksheets' | 'orders'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [wsRes, dRes, pollRes] = await Promise.all([
        fetch('/api/incoming'),
        fetch('/api/dentists?simple=true'),
        fetch('/api/email-inbox/poll'),
      ]);
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorksheets(wsData.data ?? []);
        setOrdersWithoutWorksheet(wsData.orders ?? []);
      }
      if (dRes.ok) {
        const d = await dRes.json();
        setDentists(d.data ?? []);
      }
      if (pollRes.ok) {
        const p = await pollRes.json();
        setLastPoll(p.lastPoll ? new Date(p.lastPoll) : null);
      }
    } catch {
      toast({ title: t('errorTitle'), description: t('errorLoad'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/email-inbox/poll', { method: 'POST' });
      const data = await res.json();
      if (data.result?.processed > 0) {
        toast({ title: t('syncNewOrders', { count: data.result.processed }), description: data.result.newOrders.map((o: any) => o.worksheetNumber).join(', ') });
        await fetchData();
      } else {
        toast({ title: t('syncEmpty'), description: t('syncEmptyDesc') });
      }
      setLastPoll(new Date());
    } catch {
      toast({ title: t('syncFailed'), variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  }, [toast, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredWorksheets = filterSource === 'ALL'
    ? worksheets
    : worksheets.filter((ws) => {
        if (filterSource === 'PHYSICAL') {
          return !ws.scanSource && ws.order.impressionType === 'PHYSICAL_IMPRINT';
        }
        if (filterSource === 'EMAIL') {
          return !ws.scanSource && ws.order.impressionType !== 'PHYSICAL_IMPRINT';
        }
        return ws.scanSource === filterSource;
      });

  const filteredOrders = filterSource === 'ALL'
    ? ordersWithoutWorksheet
    : ordersWithoutWorksheet.filter((o) => {
        if (filterSource === 'PHYSICAL' || filterSource === 'EMAIL') {
          return o.impressionType === 'PHYSICAL_IMPRINT';
        }
        // All digital sources map to DIGITAL_SCAN
        return o.impressionType === 'DIGITAL_SCAN';
      });

  const showWorksheets = viewMode === 'all' || viewMode === 'worksheets';
  const showOrders = viewMode === 'all' || viewMode === 'orders';
  const totalCount = (showWorksheets ? filteredWorksheets.length : 0) + (showOrders ? filteredOrders.length : 0);

  // Group by source for counts (worksheets + orders without worksheet)
  const countBySource: Record<string, number> = {};
  for (const ws of worksheets) {
    const key = ws.scanSource || (ws.order.impressionType === 'PHYSICAL_IMPRINT' ? 'PHYSICAL' : 'EMAIL');
    countBySource[key] = (countBySource[key] ?? 0) + 1;
  }
  for (const o of ordersWithoutWorksheet) {
    const key = o.impressionType === 'PHYSICAL_IMPRINT' ? 'PHYSICAL' : 'DIGITAL_SCAN';
    countBySource[key] = (countBySource[key] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">{t('title')}</h1>
              <p className="text-sm text-muted-foreground">
                {worksheets.length > 0 && t('subtitleDraft', { count: worksheets.length })}
                {worksheets.length > 0 && ordersWithoutWorksheet.length > 0 && ' · '}
                {ordersWithoutWorksheet.length > 0 && t('subtitleOrders', { count: ordersWithoutWorksheet.length })}
                {worksheets.length === 0 && ordersWithoutWorksheet.length === 0 && t('subtitleEmpty')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastPoll && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Sync: {formatDistanceToNow(lastPoll, { addSuffix: true, locale: sl })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} title={t('emailButtonTitle')}>
              {isSyncing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">{t('emailButton')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('newOrder')}
            </Button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 mt-4">
          {([
            { value: 'all', label: t('viewAll') },
            { value: 'worksheets', label: t('viewWorksheets') },
            { value: 'orders', label: t('viewOrders') },
          ] as const).map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                viewMode === m.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {m.label}
              {m.value === 'worksheets' && worksheets.length > 0 && ` (${worksheets.length})`}
              {m.value === 'orders' && ordersWithoutWorksheet.length > 0 && ` (${ordersWithoutWorksheet.length})`}
            </button>
          ))}
        </div>

        {/* Source filter pills */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setFilterSource('ALL')}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition-colors',
              filterSource === 'ALL'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'text-gray-600 border-gray-200 hover:border-gray-400'
            )}
          >
            {t('filterAll', { count: worksheets.length + ordersWithoutWorksheet.length })}
          </button>
          {SOURCES.map((s) => {
            const count = countBySource[s.value] ?? 0;
            if (count === 0 && filterSource !== s.value) return null;
            return (
              <button
                key={s.value}
                onClick={() => setFilterSource(s.value)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  filterSource === s.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'text-gray-600 border-gray-200 hover:border-gray-400'
                )}
              >
                {s.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Inbox className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t('noPendingOrders')}</p>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('addFirst')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Orders without worksheets */}
            {showOrders && filteredOrders.length > 0 && (
              <div>
                {viewMode === 'all' && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('ordersSection', { count: filteredOrders.length })}
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => (
                    <OrderCard key={order.id} order={order} locale={locale} />
                  ))}
                </div>
              </div>
            )}

            {/* DRAFT worksheets */}
            {showWorksheets && filteredWorksheets.length > 0 && (
              <div>
                {viewMode === 'all' && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t('draftSection', { count: filteredWorksheets.length })}
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredWorksheets.map((ws) => (
                    <IncomingCard key={ws.id} ws={ws} locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick-add sheet ── */}
      <QuickAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dentists={dentists}
        onCreated={fetchData}
        locale={locale}
      />
    </div>
  );
}
