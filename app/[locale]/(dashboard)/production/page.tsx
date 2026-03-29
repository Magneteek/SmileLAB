'use client';

/**
 * Production Board — Kanban by due date
 * Columns: Overdue · Today · Tomorrow · This week · Later · No date
 * Cards show all details inline (no drawer needed for basic info)
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  format, isToday, isTomorrow, isPast, parseISO,
  isThisWeek, addDays, startOfDay,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  Factory, CalendarIcon, CheckCircle2, Circle,
  Loader2, RefreshCw, ExternalLink, AlertCircle,
  Settings2, ChevronRight, Scan, Cpu, Hammer, PackageCheck,
  LayoutGrid,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Partner { id: string; name: string; type: string }

const TECHNICIAN_NAMES = ['Rommy', 'Tijo', 'Admin'] as const;
type TechnicianFilter = 'all' | typeof TECHNICIAN_NAMES[number];

interface ProductionWorksheet {
  id: string;
  worksheetNumber: string;
  patientName: string | null;
  status: string;
  scanSource: string | null;
  scanReference: string | null;
  designType: string;
  designSentAt: string | null;
  designCompletedAt: string | null;
  millingType: string;
  manufacturingMethod: string;
  millingSentAt: string | null;
  millingReceivedAt: string | null;
  scanReceivedAt: string | null;
  technicianName: string | null;
  order: { id: string; orderNumber: string; dueDate: string | null; priority: number; impressionType: string; dentist: { id: string; dentistName: string; clinicName: string } | null };
  dentist: { id: string; dentistName: string; clinicName: string } | null;
  designPartner: Partner | null;
  millingPartner: Partner | null;
  products: Array<{ id: string; quantity: number; product: { name: string; code: string } }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCAN_SOURCE_LABELS: Record<string, string> = {
  MEDIT: 'Medit', SHINING3D: 'Shining 3D', GOOGLE_DRIVE: 'Google Drive',
  THREESHAPE: '3Shape', OTHER: 'Other',
};

type Column = { key: string; label: string; headerColor: string; icon?: React.ElementType };
type GroupMode = 'date' | 'stage';

// ── Date-based columns ────────────────────────────────────────────────────────

function getDateColumn(dueDate: string | null): string {
  if (!dueDate) return 'none';
  const d = parseISO(dueDate);
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'week';
  return 'later';
}

// Labels are set at runtime using t() — see buildColumns() in the page component
const DATE_COLUMN_DEFS = [
  { key: 'overdue',  tKey: 'columnOverdue',  headerColor: 'bg-red-50 border-red-200 text-red-800',       icon: AlertCircle },
  { key: 'today',    tKey: 'columnToday',    headerColor: 'bg-orange-50 border-orange-200 text-orange-800' },
  { key: 'tomorrow', tKey: 'columnTomorrow', headerColor: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { key: 'week',     tKey: 'columnWeek',     headerColor: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'later',    tKey: 'columnLater',    headerColor: 'bg-gray-50 border-gray-200 text-gray-700' },
  { key: 'none',     tKey: 'columnNone',     headerColor: 'bg-gray-50 border-gray-200 text-gray-400' },
] as const;

// ── Stage-based columns ───────────────────────────────────────────────────────

function getStageColumn(ws: { scanReceivedAt: string | null; designCompletedAt: string | null; millingSentAt: string | null; millingReceivedAt: string | null }): string {
  if (!ws.scanReceivedAt) return 'scan';
  if (!ws.designCompletedAt) return 'design';
  if (!ws.millingSentAt) return 'milling';
  if (!ws.millingReceivedAt) return 'received';
  return 'done';
}

const STAGE_COLUMN_DEFS = [
  { key: 'scan',     tKey: 'stageScan',     headerColor: 'bg-slate-50 border-slate-200 text-slate-700',  icon: Scan },
  { key: 'design',   tKey: 'stageDesign',   headerColor: 'bg-indigo-50 border-indigo-200 text-indigo-800', icon: Cpu },
  { key: 'milling',  tKey: 'stageMilling',  headerColor: 'bg-purple-50 border-purple-200 text-purple-800', icon: Hammer },
  { key: 'received', tKey: 'stageReceived', headerColor: 'bg-amber-50 border-amber-200 text-amber-800',   icon: PackageCheck },
  { key: 'done',     tKey: 'stageDone',     headerColor: 'bg-green-50 border-green-200 text-green-800',   icon: CheckCircle2 },
] as const;

// ─── Phase step component ─────────────────────────────────────────────────────

function PhaseStep({
  icon: Icon, done, label, onToggle, disabled, sub,
}: {
  icon: React.ElementType; done: boolean; label: string; onToggle: () => void;
  disabled?: boolean; sub?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <button
        onClick={onToggle}
        disabled={disabled}
        title={label}
        className={cn(
          'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all w-full',
          done
            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        {done
          ? <CheckCircle2 className="h-4 w-4" />
          : <Icon className="h-4 w-4" />}
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </button>
      {sub && (
        <span className="text-[9px] text-center text-blue-600 leading-tight max-w-[56px] truncate" title={sub}>
          ↗ {sub}
        </span>
      )}
    </div>
  );
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

function WorksheetCard({
  ws, locale, t, isUpdating, dueDatePopover, partners,
  onTogglePhase, onUpdateDueDate, onSetDueDatePopover, onSendToQC, onOpenDrawer,
}: {
  ws: ProductionWorksheet; locale: string; t: (k: string) => string;
  isUpdating: boolean; dueDatePopover: string | null; partners: Partner[];
  onTogglePhase: (field: any) => void;
  onUpdateDueDate: (date: Date | undefined) => void;
  onSetDueDatePopover: (id: string | null) => void;
  onSendToQC: () => void;
  onOpenDrawer: () => void;
}) {
  const allDone = !!ws.scanReceivedAt && !!ws.designCompletedAt && !!ws.millingSentAt && !!ws.millingReceivedAt;
  const dueDate = ws.order.dueDate ? parseISO(ws.order.dueDate) : null;
  const overdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const today = dueDate && isToday(dueDate);

  const progressCount = [ws.scanReceivedAt, ws.designCompletedAt, ws.millingSentAt, ws.millingReceivedAt].filter(Boolean).length;

  return (
    <Card className={cn(
      'p-3 flex flex-col gap-2.5 transition-opacity select-none',
      isUpdating && 'opacity-60',
      ws.status === 'DRAFT' && 'border-slate-300 bg-slate-50/40',
      ws.status === 'QC_PENDING' && 'border-blue-300 bg-blue-50/20',
      ws.status === 'QC_REJECTED' && 'border-orange-300 bg-orange-50/40',
      allDone && !isUpdating && 'border-green-300 bg-green-50/20',
    )}>

      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/${locale}/worksheets/${ws.id}`}
              className="font-mono text-sm font-bold text-blue-600 hover:underline"
            >
              {ws.worksheetNumber}
            </Link>
            {ws.status === 'DRAFT' && (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1 py-0">{t('statusDraft')}</Badge>
            )}
            {ws.status === 'QC_PENDING' && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1 py-0">{t('statusQcPending')}</Badge>
            )}
            {ws.status === 'QC_REJECTED' && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1 py-0">{t('statusQcRejected')}</Badge>
            )}
            {ws.order.priority === 2 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1 py-0">{t('urgent')}</Badge>
            )}
            {ws.order.priority === 1 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1 py-0">{t('high')}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-sm font-medium truncate">{ws.patientName || '—'}</p>
            {ws.technicianName && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200 rounded px-1.5 py-0">
                {ws.technicianName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{(ws.dentist ?? ws.order.dentist)?.clinicName ?? '—'}</p>
        </div>

        {/* Due date pill */}
        <div className="flex-shrink-0">
          <Popover
            open={dueDatePopover === ws.id}
            onOpenChange={(open) => onSetDueDatePopover(open ? ws.id : null)}
          >
            <PopoverTrigger asChild>
              <button className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors',
                overdue && 'bg-red-100 text-red-700 hover:bg-red-200',
                today && 'bg-orange-100 text-orange-700 hover:bg-orange-200',
                !overdue && !today && dueDate && 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                !dueDate && 'text-muted-foreground hover:text-foreground',
              )}>
                {overdue && <AlertCircle className="h-3 w-3" />}
                <CalendarIcon className="h-3 w-3" />
                {dueDate ? format(dueDate, 'd. M.') : <span className="text-[10px]">{t('dateUnset')}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dueDate ?? undefined}
                onSelect={(d) => onUpdateDueDate(d as Date | undefined)}
                initialFocus
              />
              {ws.order.dueDate && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs"
                    onClick={() => onUpdateDueDate(undefined)}>
                    {t('clearDate')}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Products ── */}
      {ws.products.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ws.products.map((p) => (
            <span key={p.id}
              className="text-[11px] bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 font-medium truncate max-w-[160px]"
              title={p.product.name}>
              {p.quantity > 1 ? `${p.quantity}× ` : ''}{p.product.name}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">{t('noProducts')}</span>
      )}

      {/* ── Scan source ── */}
      {(ws.scanSource || ws.order.impressionType === 'DIGITAL_SCAN') && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scan className="h-3 w-3 flex-shrink-0" />
          <span>{ws.scanSource ? SCAN_SOURCE_LABELS[ws.scanSource] ?? ws.scanSource : t('digitalScan')}</span>
          {ws.scanReference && (
            <a
              href={ws.scanReference.startsWith('http') ? ws.scanReference : undefined}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-0.5 ml-0.5"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{ws.scanReference}</span>
            </a>
          )}
        </div>
      )}

      {/* ── External partners ── */}
      {(ws.designType === 'EXTERNAL' && ws.designPartner) && (
        <div className="flex items-center gap-1 text-xs">
          <Cpu className="h-3 w-3 text-indigo-500 flex-shrink-0" />
          <span className="text-indigo-700 font-medium truncate">CAD: {ws.designPartner?.name}</span>
          {ws.designSentAt && (
            <span className="text-muted-foreground ml-auto flex-shrink-0">{format(parseISO(ws.designSentAt), 'd.M.')}</span>
          )}
        </div>
      )}
      {(ws.millingType === 'EXTERNAL' && ws.millingPartner) && (
        <div className="flex items-center gap-1 text-xs">
          <Hammer className="h-3 w-3 text-purple-500 flex-shrink-0" />
          <span className="text-purple-700 font-medium truncate">{ws.manufacturingMethod === 'PRINTING' ? t('phasePrinting') : t('phaseMilling')}: {ws.millingPartner?.name}</span>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{t('progress')}</span>
          <span className="text-[10px] font-medium text-muted-foreground">{progressCount}/4</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <PhaseStep
            icon={Scan} done={!!ws.scanReceivedAt} label={t('phaseScan')}
            onToggle={() => onTogglePhase('scanReceivedAt')} disabled={isUpdating}
          />
          <PhaseStep
            icon={Cpu} done={!!ws.designCompletedAt} label={t('phaseCAD')}
            onToggle={() => onTogglePhase('designCompletedAt')} disabled={isUpdating}
            sub={ws.designType === 'EXTERNAL' && ws.designPartner ? ws.designPartner.name : null}
          />
          <PhaseStep
            icon={Hammer} done={!!ws.millingSentAt} label={ws.manufacturingMethod === 'PRINTING' ? t('phasePrinting') : t('phaseMilling')}
            onToggle={() => onTogglePhase('millingSentAt')} disabled={isUpdating}
            sub={ws.millingType === 'EXTERNAL' && ws.millingPartner ? ws.millingPartner.name : null}
          />
          <PhaseStep
            icon={PackageCheck} done={!!ws.millingReceivedAt} label={t('phaseReceived')}
            onToggle={() => onTogglePhase('millingReceivedAt')} disabled={isUpdating}
          />
        </div>
        {/* Progress fill */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300',
              progressCount === 4 ? 'bg-green-500' : 'bg-blue-400')}
            style={{ width: `${progressCount * 25}%` }}
          />
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between pt-0.5">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2 gap-1"
          onClick={onOpenDrawer}>
          <Settings2 className="h-3 w-3" />
          {t('settings')}
        </Button>

        {allDone ? (
          <Button size="sm" onClick={onSendToQC} disabled={isUpdating}
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-3 gap-1">
            {isUpdating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <><ChevronRight className="h-3 w-3" />→ QC</>}
          </Button>
        ) : (
          <Link href={`/${locale}/worksheets/${ws.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2">
              {t('open')}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const locale = useLocale();
  const t = useTranslations('production');
  const { toast } = useToast();

  const [worksheets, setWorksheets] = useState<ProductionWorksheet[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('date');
  const [technicianFilter, setTechnicianFilter] = useState<TechnicianFilter>('all');

  // Detail drawer (for scan/partner config)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWorksheet, setDrawerWorksheet] = useState<ProductionWorksheet | null>(null);
  const [drawerSaving, setDrawerSaving] = useState(false);

  // Inline due date popover
  const [dueDatePopover, setDueDatePopover] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [wsRes, pRes] = await Promise.all([
        fetch('/api/production'),
        fetch('/api/partners?active=true'),
      ]);
      if (wsRes.ok) setWorksheets((await wsRes.json()).data);
      if (pRes.ok) setPartners((await pRes.json()).data);
    } catch {
      toast({ title: t('errorTitle'), description: t('errorLoad'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePhase = async (ws: ProductionWorksheet, field: keyof ProductionWorksheet) => {
    const current = ws[field] as string | null;
    const newValue = current ? null : new Date().toISOString();
    setWorksheets((prev) => prev.map((w) => w.id === ws.id ? { ...w, [field]: newValue } : w));
    setUpdatingId(ws.id);
    try {
      const res = await fetch(`/api/production/${ws.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setWorksheets((prev) => prev.map((w) => w.id === ws.id ? { ...w, [field]: current } : w));
      toast({ title: t('errorTitle'), description: t('errorUpdate'), variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateDueDate = async (ws: ProductionWorksheet, date: Date | undefined) => {
    const newDate = date ? date.toISOString() : null;
    setDueDatePopover(null);
    setWorksheets((prev) => prev.map((w) => w.id === ws.id ? { ...w, order: { ...w.order, dueDate: newDate } } : w));
    try {
      const res = await fetch(`/api/production/${ws.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDate }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast({ title: t('errorTitle'), description: t('errorDate'), variant: 'destructive' });
      fetchData();
    }
  };

  const sendToQC = async (ws: ProductionWorksheet) => {
    setUpdatingId(ws.id);
    try {
      const res = await fetch(`/api/worksheets/${ws.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus: 'QC_PENDING' }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t('sentToQCTitle'), description: t('sentToQCDesc', { worksheetNumber: ws.worksheetNumber }) });
      setWorksheets((prev) => prev.filter((w) => w.id !== ws.id));
    } catch {
      toast({ title: t('errorTitle'), description: t('errorQC'), variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openDrawer = (ws: ProductionWorksheet) => { setDrawerWorksheet({ ...ws }); setDrawerOpen(true); };

  const saveDrawer = async () => {
    if (!drawerWorksheet) return;
    setDrawerSaving(true);
    try {
      const res = await fetch(`/api/production/${drawerWorksheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanSource: drawerWorksheet.scanSource,
          scanReference: drawerWorksheet.scanReference,
          designType: drawerWorksheet.designType,
          designPartnerId: drawerWorksheet.designPartner?.id ?? null,
          designSentAt: drawerWorksheet.designSentAt,
          millingType: drawerWorksheet.millingType,
          manufacturingMethod: drawerWorksheet.manufacturingMethod ?? 'MILLING',
          millingPartnerId: drawerWorksheet.millingPartner?.id ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      setWorksheets((prev) => prev.map((w) => w.id === drawerWorksheet.id ? { ...drawerWorksheet } : w));
      toast({ title: t('savedTitle'), description: t('savedDesc') });
      setDrawerOpen(false);
    } catch {
      toast({ title: t('errorTitle'), description: t('errorSave'), variant: 'destructive' });
    } finally {
      setDrawerSaving(false);
    }
  };

  // ── Group worksheets into columns ─────────────────────────────────────────

  const DATE_COLUMNS: Column[] = DATE_COLUMN_DEFS.map((d) => ({ key: d.key, label: t(d.tKey), headerColor: d.headerColor, icon: 'icon' in d ? d.icon as React.ElementType : undefined }));
  const STAGE_COLUMNS: Column[] = STAGE_COLUMN_DEFS.map((d) => ({ key: d.key, label: t(d.tKey), headerColor: d.headerColor, icon: d.icon as React.ElementType }));

  const COLUMNS = groupMode === 'date' ? DATE_COLUMNS : STAGE_COLUMNS;
  const getColKey = (ws: ProductionWorksheet) =>
    groupMode === 'date' ? getDateColumn(ws.order.dueDate) : getStageColumn(ws);

  const filteredWorksheets = technicianFilter === 'all'
    ? worksheets
    : worksheets.filter((ws) => ws.technicianName === technicianFilter);

  const grouped = COLUMNS.reduce<Record<string, ProductionWorksheet[]>>((acc, col) => {
    acc[col.key] = filteredWorksheets.filter((ws) => getColKey(ws) === col.key);
    return acc;
  }, {});

  const visibleColumns = COLUMNS.filter((col) => grouped[col.key].length > 0);
  const totalVisible = filteredWorksheets.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── Header ── */}
      <div className="flex justify-between items-center px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Factory className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-bold leading-none">{t('title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('activeOrders', { count: totalVisible })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Technician filter */}
          <div className="flex items-center rounded-lg border bg-white p-0.5 gap-0.5">
            <button
              onClick={() => setTechnicianFilter('all')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                technicianFilter === 'all' ? 'bg-gray-900 text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('techAll')}
            </button>
            {TECHNICIAN_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => setTechnicianFilter(name)}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  technicianFilter === name ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Group mode toggle */}
          <div className="flex items-center rounded-lg border bg-white p-0.5 gap-0.5">
            <button
              onClick={() => setGroupMode('date')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                groupMode === 'date'
                  ? 'bg-gray-900 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('groupByDate')}
            </button>
            <button
              onClick={() => setGroupMode('stage')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                groupMode === 'stage'
                  ? 'bg-gray-900 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t('groupByStage')}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {totalVisible === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{t('noActive')}</p>
            <p className="text-sm">{t('noActiveDesc')}</p>
          </div>
        </div>
      ) : (
        /* ── Kanban board ── */
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 h-full min-w-max items-start">
            {visibleColumns.map((col) => (
              <div key={col.key} className="flex flex-col gap-2 w-[300px] flex-shrink-0">
                {/* Column header */}
                <div className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg border font-medium text-sm',
                  col.headerColor
                )}>
                  <span className="flex items-center gap-1.5">
                    {col.icon && <col.icon className="h-3.5 w-3.5 opacity-70" />}
                    {col.label}
                  </span>
                  <span className={cn(
                    'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                    col.key === 'overdue' ? 'bg-red-200 text-red-800' :
                    col.key === 'today' ? 'bg-orange-200 text-orange-800' :
                    'bg-white/60'
                  )}>
                    {grouped[col.key].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {grouped[col.key].map((ws) => (
                    <WorksheetCard
                      key={ws.id}
                      ws={ws}
                      locale={locale}
                      t={t}
                      isUpdating={updatingId === ws.id}
                      dueDatePopover={dueDatePopover}
                      partners={partners}
                      onTogglePhase={(field) => togglePhase(ws, field)}
                      onUpdateDueDate={(date) => updateDueDate(ws, date)}
                      onSetDueDatePopover={setDueDatePopover}
                      onSendToQC={() => sendToQC(ws)}
                      onOpenDrawer={() => openDrawer(ws)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Settings drawer (scan source / partners) ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawerWorksheet && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <SheetTitle className="text-base">{t('drawerTitle', { number: drawerWorksheet.worksheetNumber })}</SheetTitle>
                <SheetDescription>
                  {drawerWorksheet.patientName} · {(drawerWorksheet.dentist ?? drawerWorksheet.order.dentist)?.clinicName ?? '—'}
                </SheetDescription>
              </SheetHeader>

              <div className="px-6 py-6 space-y-6">
                {/* Scan source */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t('drawerScanTitle')}</h3>
                  <div className="space-y-2">
                    <Label>{t('scanSource')}</Label>
                    <Select
                      value={drawerWorksheet.scanSource ?? 'none'}
                      onValueChange={(v) => setDrawerWorksheet((w) => w ? { ...w, scanSource: v === 'none' ? null : v } : w)}
                    >
                      <SelectTrigger><SelectValue placeholder={t('scanSourcePlaceholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('scanSourceNone')}</SelectItem>
                        <SelectItem value="MEDIT">Medit Link</SelectItem>
                        <SelectItem value="SHINING3D">Shining 3D</SelectItem>
                        <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
                        <SelectItem value="THREESHAPE">3Shape</SelectItem>
                        <SelectItem value="OTHER">{t('scanSourceOther')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('scanRef')}</Label>
                    <Input
                      placeholder={t('scanRefPlaceholder')}
                      value={drawerWorksheet.scanReference ?? ''}
                      onChange={(e) => setDrawerWorksheet((w) => w ? { ...w, scanReference: e.target.value || null } : w)}
                    />
                  </div>
                </div>

                <hr />

                {/* Design */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t('designSection')}</h3>
                  <div className="space-y-2">
                    <Label>{t('designDoneBy')}</Label>
                    <Select
                      value={drawerWorksheet.designType}
                      onValueChange={(v) => setDrawerWorksheet((w) => w ? { ...w, designType: v, designPartner: v === 'INTERNAL' ? null : w.designPartner } : w)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">{t('designInternal')}</SelectItem>
                        <SelectItem value="EXTERNAL">{t('designExternal')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {drawerWorksheet.designType === 'EXTERNAL' && (
                    <>
                      <div className="space-y-2">
                        <Label>{t('designPartnerLabel')}</Label>
                        <Select
                          value={drawerWorksheet.designPartner?.id ?? 'none'}
                          onValueChange={(v) => {
                            const p = partners.find((p) => p.id === v) ?? null;
                            setDrawerWorksheet((w) => w ? { ...w, designPartner: p } : w);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder={t('designPartnerPlaceholder')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('partnerNone')}</SelectItem>
                            {partners.filter((p) => p.type === 'DESIGN' || p.type === 'BOTH').map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('sentDate')}</Label>
                        <Input
                          type="date"
                          value={drawerWorksheet.designSentAt ? format(parseISO(drawerWorksheet.designSentAt), 'yyyy-MM-dd') : ''}
                          onChange={(e) => setDrawerWorksheet((w) => w ? { ...w, designSentAt: e.target.value ? new Date(e.target.value).toISOString() : null } : w)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <hr />

                {/* Milling / Printing */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t('millingSection')}</h3>
                  <div className="space-y-2">
                    <Label>{t('millingMethodLabel')}</Label>
                    <Select
                      value={drawerWorksheet.manufacturingMethod ?? 'MILLING'}
                      onValueChange={(v) => setDrawerWorksheet((w) => w ? { ...w, manufacturingMethod: v } : w)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MILLING">{t('millingMilling')}</SelectItem>
                        <SelectItem value="PRINTING">{t('millingPrinting')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('millingDoneBy')}</Label>
                    <Select
                      value={drawerWorksheet.millingType}
                      onValueChange={(v) => setDrawerWorksheet((w) => w ? { ...w, millingType: v, millingPartner: v === 'INTERNAL' ? null : w.millingPartner } : w)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">{t('millingInternal')}</SelectItem>
                        <SelectItem value="EXTERNAL">{t('millingExternal')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {drawerWorksheet.millingType === 'EXTERNAL' && (
                    <div className="space-y-2">
                      <Label>{t('millingPartnerLabel')}</Label>
                      <Select
                        value={drawerWorksheet.millingPartner?.id ?? 'none'}
                        onValueChange={(v) => {
                          const p = partners.find((p) => p.id === v) ?? null;
                          setDrawerWorksheet((w) => w ? { ...w, millingPartner: p } : w);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder={t('millingPartnerPlaceholder')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('partnerNone')}</SelectItem>
                          {partners.filter((p) => p.type === 'MILLING' || p.type === 'BOTH').map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button className="flex-1" onClick={saveDrawer} disabled={drawerSaving}>
                    {drawerSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('save')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
