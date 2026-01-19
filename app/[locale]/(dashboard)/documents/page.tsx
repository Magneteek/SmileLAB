'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Search,
  Filter,
  FileCheck,
  Receipt,
  ClipboardList,
  FolderOpen,
  Plus,
  DollarSign,
  Package,
  Users,
  FileBarChart,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DocumentType = 'ANNEX_XIII' | 'INVOICE' | 'DELIVERY_NOTE' | 'QC_REPORT' | 'OTHER';

interface Document {
  id: string;
  worksheetId: string | null;
  type: DocumentType;
  documentNumber: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  generatedAt: string;
  retentionUntil: string;
  generatedBy: string | null;
  notes: string | null;
  worksheet?: {
    worksheetNumber: string;
    dentist: {
      clinicName: string;
    };
  };
}

const documentTypeIcons: Record<DocumentType, JSX.Element> = {
  ANNEX_XIII: <FileCheck className="h-3 w-3" />,
  INVOICE: <Receipt className="h-3 w-3" />,
  DELIVERY_NOTE: <ClipboardList className="h-3 w-3" />,
  QC_REPORT: <FileText className="h-3 w-3" />,
  OTHER: <FolderOpen className="h-3 w-3" />,
};

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const locale = useLocale();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [worksheetNumber, setWorksheetNumber] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const { toast } = useToast();

  const documentTypeLabels: Record<DocumentType, string> = {
    ANNEX_XIII: t('library.documentTypes.ANNEX_XIII'),
    INVOICE: t('library.documentTypes.INVOICE'),
    DELIVERY_NOTE: t('library.documentTypes.DELIVERY_NOTE'),
    QC_REPORT: t('library.documentTypes.QC_REPORT'),
    OTHER: t('library.documentTypes.OTHER'),
  };

  // Report generation states
  const [priceListActiveOnly, setPriceListActiveOnly] = useState(true);
  const [materialListActiveOnly, setMaterialListActiveOnly] = useState(true);
  const [materialListShowExpired, setMaterialListShowExpired] = useState(false);
  const [dentistListActiveOnly, setDentistListActiveOnly] = useState(true);
  const [qcDateFrom, setQcDateFrom] = useState('');
  const [qcDateTo, setQcDateTo] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: t('toast.error.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) throw new Error('Failed to download document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: t('toast.success.downloaded'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('toast.error.downloadFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleGenerateWorksheetDocuments = async () => {
    if (!worksheetNumber.trim()) {
      toast({
        title: 'Error',
        description: t('toast.error.enterWorksheetNumber'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerateLoading(true);
      const response = await fetch('/api/documents/generate-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetNumber }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate documents');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: t('toast.success.documentsGenerated', {
          count: result.generated.length,
          worksheetNumber,
        }),
      });

      setWorksheetNumber('');
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate documents',
        variant: 'destructive',
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string, params: URLSearchParams) => {
    try {
      // Add locale to params
      params.append('locale', locale);

      const response = await fetch(`/api/reports/${reportType}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || `${reportType}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: t('toast.success.reportGenerated'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('toast.error.generateFailed'),
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.worksheet?.worksheetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.worksheet?.dentist.clinicName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-sm font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-xs">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="reports" className="space-y-2">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="inline-flex min-w-full md:min-w-0">
            <TabsTrigger value="reports" className="flex-1 md:flex-none whitespace-nowrap">{t('tabs.reports')}</TabsTrigger>
            <TabsTrigger value="worksheet" className="flex-1 md:flex-none whitespace-nowrap">{t('tabs.worksheet')}</TabsTrigger>
            <TabsTrigger value="library" className="flex-1 md:flex-none whitespace-nowrap">{t('tabs.library')}</TabsTrigger>
          </TabsList>
        </div>

        {/* Generate Reports Tab */}
        <TabsContent value="reports" className="space-y-2">
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Price List */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                  <DollarSign className="h-3 w-3" />
                  {t('reports.priceList.title')}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {t('reports.priceList.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-1 space-y-1">
                <div className="flex items-center space-x-1">
                  <Checkbox
                    id="price-active"
                    checked={priceListActiveOnly}
                    onCheckedChange={(checked) => setPriceListActiveOnly(checked as boolean)}
                  />
                  <Label htmlFor="price-active" className="text-[10px] font-normal">
                    {t('reports.priceList.activeOnly')}
                  </Label>
                </div>
                <Button
                  className="w-full text-xs py-1 px-2 h-7"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (priceListActiveOnly) params.append('activeOnly', 'true');
                    handleGenerateReport('price-list', params);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t('reports.priceList.generate')}
                </Button>
              </CardContent>
            </Card>

            {/* Material List */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                  <Package className="h-3 w-3" />
                  {t('reports.materialList.title')}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {t('reports.materialList.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-1 space-y-1">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <Checkbox
                      id="material-active"
                      checked={materialListActiveOnly}
                      onCheckedChange={(checked) => setMaterialListActiveOnly(checked as boolean)}
                    />
                    <Label htmlFor="material-active" className="text-[10px] font-normal">
                      {t('reports.materialList.activeOnly')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Checkbox
                      id="material-expired"
                      checked={materialListShowExpired}
                      onCheckedChange={(checked) => setMaterialListShowExpired(checked as boolean)}
                    />
                    <Label htmlFor="material-expired" className="text-[10px] font-normal">
                      {t('reports.materialList.includeExpired')}
                    </Label>
                  </div>
                </div>
                <Button
                  className="w-full text-xs py-1 px-2 h-7"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (materialListActiveOnly) params.append('activeOnly', 'true');
                    if (materialListShowExpired) params.append('showExpired', 'true');
                    handleGenerateReport('material-list', params);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t('reports.materialList.generate')}
                </Button>
              </CardContent>
            </Card>

            {/* Outstanding Invoices */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                  <Receipt className="h-3 w-3" />
                  {t('reports.outstandingInvoices.title')}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {t('reports.outstandingInvoices.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-1">
                <Button
                  className="w-full text-xs py-1 px-2 h-7"
                  onClick={() => handleGenerateReport('outstanding-invoices', new URLSearchParams())}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t('reports.outstandingInvoices.generate')}
                </Button>
              </CardContent>
            </Card>

            {/* Dentist List */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                  <Users className="h-3 w-3" />
                  {t('reports.clientDirectory.title')}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {t('reports.clientDirectory.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-1 space-y-1">
                <div className="flex items-center space-x-1">
                  <Checkbox
                    id="dentist-active"
                    checked={dentistListActiveOnly}
                    onCheckedChange={(checked) => setDentistListActiveOnly(checked as boolean)}
                  />
                  <Label htmlFor="dentist-active" className="text-[10px] font-normal">
                    {t('reports.clientDirectory.activeOnly')}
                  </Label>
                </div>
                <Button
                  className="w-full text-xs py-1 px-2 h-7"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (dentistListActiveOnly) params.append('activeOnly', 'true');
                    handleGenerateReport('dentist-list', params);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t('reports.clientDirectory.generate')}
                </Button>
              </CardContent>
            </Card>

            {/* QC Reports */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                  <ClipboardCheck className="h-3 w-3" />
                  {t('reports.qcReports.title')}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {t('reports.qcReports.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-1 space-y-1">
                <div className="space-y-0.5">
                  <Label htmlFor="qc-from" className="text-[10px]">{t('reports.qcReports.dateFrom')}</Label>
                  <Input
                    id="qc-from"
                    type="date"
                    value={qcDateFrom}
                    onChange={(e) => setQcDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="qc-to" className="text-[10px]">{t('reports.qcReports.dateTo')}</Label>
                  <Input
                    id="qc-to"
                    type="date"
                    value={qcDateTo}
                    onChange={(e) => setQcDateTo(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full text-xs py-1 px-2 h-7"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (qcDateFrom) params.append('dateFrom', qcDateFrom);
                    if (qcDateTo) params.append('dateTo', qcDateTo);
                    handleGenerateReport('qc-reports', params);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {t('reports.qcReports.generate')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Worksheet Documents Tab */}
        <TabsContent value="worksheet">
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle>{t('worksheetDocuments.title')}</CardTitle>
              <CardDescription className="text-[10px]">
                {t('worksheetDocuments.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-1 space-y-1">
              <div className="space-y-1">
                <Label htmlFor="worksheet-number">{t('worksheetDocuments.worksheetNumberLabel')}</Label>
                <Input
                  id="worksheet-number"
                  placeholder={t('worksheetDocuments.worksheetNumberPlaceholder')}
                  value={worksheetNumber}
                  onChange={(e) => setWorksheetNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateWorksheetDocuments();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleGenerateWorksheetDocuments}
                disabled={generateLoading || !worksheetNumber.trim()}
                className="w-full text-xs py-1 px-2 h-7"
              >
                {generateLoading ? t('worksheetDocuments.generating') : t('worksheetDocuments.generate')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle>{t('library.title')}</CardTitle>
              <CardDescription className="text-[10px]">
                {t('library.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className="mb-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder={t('library.searchPlaceholder')}
                    className="pl-7 text-xs h-7"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px] text-xs h-7">
                    <Filter className="mr-1 h-3 w-3" />
                    <SelectValue placeholder={t('library.filterByType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('library.allTypes')}</SelectItem>
                    <SelectItem value="ANNEX_XIII">{t('library.documentTypes.ANNEX_XIII')}</SelectItem>
                    <SelectItem value="INVOICE">{t('library.documentTypes.INVOICE')}</SelectItem>
                    <SelectItem value="DELIVERY_NOTE">{t('library.documentTypes.DELIVERY_NOTE')}</SelectItem>
                    <SelectItem value="QC_REPORT">{t('library.documentTypes.QC_REPORT')}</SelectItem>
                    <SelectItem value="OTHER">{t('library.documentTypes.OTHER')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{t('library.loading')}</div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">{t('library.noDocuments')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('library.table.type')}</TableHead>
                      <TableHead>{t('library.table.documentNumber')}</TableHead>
                      <TableHead>{t('library.table.worksheet')}</TableHead>
                      <TableHead>{t('library.table.client')}</TableHead>
                      <TableHead>{t('library.table.generated')}</TableHead>
                      <TableHead>{t('library.table.retentionUntil')}</TableHead>
                      <TableHead>{t('library.table.size')}</TableHead>
                      <TableHead className="text-right">{t('library.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {documentTypeIcons[doc.type]}
                            <span className="text-sm font-medium">
                              {documentTypeLabels[doc.type]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.documentNumber}
                        </TableCell>
                        <TableCell>
                          {doc.worksheet ? (
                            <span className="font-mono text-sm">
                              {doc.worksheet.worksheetNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.worksheet ? (
                            <span className="text-sm">
                              {doc.worksheet.dentist.clinicName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(doc.generatedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(doc.retentionUntil)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.id, doc.fileName)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
