/**
 * Quality Control Dashboard Component
 *
 * Displays pending QC worksheets with statistics and filters
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format } from 'date-fns';
import { ClipboardCheck, Clock, CheckCircle, XCircle, AlertCircle, Search, FileText, Download, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QCStatistics {
  totalInspections: number;
  pendingInspections: number;
  todayInspections: number;
  approvedCount: number;
  rejectedCount: number;
  conditionalCount: number;
  approvalRate: number;
}

interface WorksheetForQC {
  id: string;
  worksheetNumber: string;
  status: string;
  patientName: string | null;
  deviceDescription: string | null;
  createdAt: Date;
  order: {
    id: string;
    orderNumber: string;
    dentist: {
      id: string;
      dentistName: string;
      clinicName: string | null;
    };
  };
  products: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      category: string;
    };
  }>;
  materials: Array<{
    id: string;
    material: {
      id: string;
      name: string;
      type: string;
    };
    materialLot: {
      id: string;
      lotNumber: string;
    } | null;
  }>;
  qualityControls: Array<{
    id: string;
    result: string;
    inspector: {
      id: string;
      name: string;
    };
  }>;
  createdBy: {
    id: string;
    name: string;
  };
}

interface CompletedWorksheet extends WorksheetForQC {
  documents: Array<{
    id: string;
    type: string;
    documentNumber: string;
    generatedAt: Date;
    retentionUntil: Date;
  }>;
}

interface QCDashboardProps {
  worksheets: WorksheetForQC[];
  completedWorksheets: CompletedWorksheet[];
  statistics: QCStatistics;
  userRole: string;
}

// ============================================================================
// STATISTICS CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}

function StatCard({ title, value, icon, description, variant = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-blue-600 bg-blue-100',
    warning: 'text-yellow-600 bg-yellow-100',
    success: 'text-green-600 bg-green-100',
    danger: 'text-red-600 bg-red-100',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[variant]}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QCDashboard({ worksheets, completedWorksheets, statistics, userRole }: QCDashboardProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [completedSearch, setCompletedSearch] = useState('');

  // Filter worksheets based on search query
  const filteredWorksheets = worksheets.filter((worksheet) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      worksheet.worksheetNumber.toLowerCase().includes(searchLower) ||
      worksheet.order.orderNumber.toLowerCase().includes(searchLower) ||
      worksheet.patientName?.toLowerCase().includes(searchLower) ||
      worksheet.order.dentist.dentistName.toLowerCase().includes(searchLower) ||
      worksheet.order.dentist.clinicName?.toLowerCase().includes(searchLower)
    );
  });

  // Filter completed worksheets
  const filteredCompleted = completedWorksheets.filter((worksheet) => {
    const searchLower = completedSearch.toLowerCase();
    return (
      worksheet.worksheetNumber.toLowerCase().includes(searchLower) ||
      worksheet.order.orderNumber.toLowerCase().includes(searchLower) ||
      worksheet.patientName?.toLowerCase().includes(searchLower) ||
      worksheet.order.dentist.dentistName.toLowerCase().includes(searchLower) ||
      worksheet.order.dentist.clinicName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('qualityControl.pendingInspectionsTitle')}
          value={statistics.pendingInspections}
          icon={<Clock className="h-4 w-4" />}
          description={t('qualityControl.pendingInQueue', { count: filteredWorksheets.length })}
          variant="warning"
        />
        <StatCard
          title={t('qualityControl.todayInspectionsTitle')}
          value={statistics.todayInspections}
          icon={<ClipboardCheck className="h-4 w-4" />}
          description={t('qualityControl.completedToday')}
          variant="default"
        />
        <StatCard
          title={t('qualityControl.approvalRateTitle')}
          value={`${statistics.approvalRate}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          description={t('qualityControl.overallPassRate')}
          variant="success"
        />
        <StatCard
          title={t('qualityControl.totalInspectionsTitle')}
          value={statistics.totalInspections}
          icon={<AlertCircle className="h-4 w-4" />}
          description={t('qualityControl.approvedRejected', { approved: statistics.approvedCount, rejected: statistics.rejectedCount })}
          variant="default"
        />
      </div>

      {/* Tabs for Pending vs Completed */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            {t('qualityControl.pendingTab', { count: filteredWorksheets.length })}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('qualityControl.completedTab', { count: filteredCompleted.length })}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>{t('qualityControl.pendingWorksheetsTitle')}</CardTitle>
              <CardDescription>{t('qualityControl.pendingWorksheetsDescription')}</CardDescription>
            </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('qualityControl.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Worksheets Table */}
          {filteredWorksheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">{t('qualityControl.noPendingWorksheets')}</p>
              <p className="text-sm">{t('qualityControl.allInspected')}</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('qualityControl.dnNumber')}</TableHead>
                    <TableHead>{t('qualityControl.dentist')}</TableHead>
                    <TableHead>{t('qualityControl.patient')}</TableHead>
                    <TableHead>{t('qualityControl.products')}</TableHead>
                    <TableHead>{t('qualityControl.materials')}</TableHead>
                    <TableHead>{t('qualityControl.created')}</TableHead>
                    <TableHead className="text-right">{t('qualityControl.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorksheets.map((worksheet) => (
                    <TableRow key={worksheet.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/worksheets/${worksheet.id}`}
                          className="hover:underline text-blue-600"
                        >
                          {worksheet.worksheetNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {worksheet.order.dentist.dentistName}
                          </div>
                          {worksheet.order.dentist.clinicName && (
                            <div className="text-sm text-muted-foreground">
                              {worksheet.order.dentist.clinicName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{worksheet.patientName || <span className="text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {worksheet.products.map((wp) => (
                            <div key={wp.id} className="text-sm">
                              {wp.product.name} x{wp.quantity}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {t('qualityControl.materialCount', { count: worksheet.materials.length })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(worksheet.createdAt), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(worksheet.createdAt), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/worksheets/${worksheet.id}/qc`}>
                            {t('qualityControl.inspectNowButton')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>{t('qualityControl.completedWorksheetsTitle')}</CardTitle>
              <CardDescription>{t('qualityControl.completedWorksheetsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('qualityControl.searchCompletedPlaceholder')}
                    value={completedSearch}
                    onChange={(e) => setCompletedSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Completed Worksheets Table */}
              {filteredCompleted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">{t('qualityControl.noCompletedWorksheets')}</p>
                  <p className="text-sm">{t('qualityControl.completedWorksheets')}</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('qualityControl.dnNumber')}</TableHead>
                        <TableHead>{t('qualityControl.dentist')}</TableHead>
                        <TableHead>{t('qualityControl.qcResult')}</TableHead>
                        <TableHead>{t('qualityControl.inspector')}</TableHead>
                        <TableHead>{t('qualityControl.date')}</TableHead>
                        <TableHead>{t('qualityControl.document')}</TableHead>
                        <TableHead className="text-right">{t('qualityControl.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompleted.map((worksheet) => {
                        const qcRecord = worksheet.qualityControls[0];
                        const annexDoc = worksheet.documents.find(d => d.type === 'ANNEX_XIII');

                        return (
                          <TableRow key={worksheet.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/worksheets/${worksheet.id}`}
                                className="hover:underline text-blue-600"
                              >
                                {worksheet.worksheetNumber}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {worksheet.order.dentist.dentistName}
                                </div>
                                {worksheet.order.dentist.clinicName && (
                                  <div className="text-sm text-muted-foreground">
                                    {worksheet.order.dentist.clinicName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {qcRecord ? (
                                <Badge
                                  variant={
                                    qcRecord.result === 'APPROVED' ? 'default' :
                                    qcRecord.result === 'CONDITIONAL' ? 'secondary' :
                                    'destructive'
                                  }
                                  className={
                                    qcRecord.result === 'APPROVED' ? 'bg-green-500' :
                                    qcRecord.result === 'CONDITIONAL' ? 'bg-yellow-500' :
                                    ''
                                  }
                                >
                                  {qcRecord.result === 'APPROVED' ? t('qualityControl.approved') :
                                   qcRecord.result === 'REJECTED' ? t('qualityControl.rejected') :
                                   qcRecord.result === 'CONDITIONAL' ? t('qualityControl.conditional') :
                                   qcRecord.result}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('qualityControl.notAvailable')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {qcRecord ? (
                                <div className="text-sm">{qcRecord.inspector.name}</div>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('qualityControl.notAvailable')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {qcRecord ? (
                                <div className="text-sm">
                                  {format(new Date(qcRecord.inspectionDate), 'MMM dd, yyyy')}
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(qcRecord.inspectionDate), 'HH:mm')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('qualityControl.notAvailable')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {annexDoc ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-semibold text-green-600">{annexDoc.documentNumber}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground pl-6">{t('qualityControl.annexThirteen')}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{t('qualityControl.noDocument')}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/worksheets/${worksheet.id}`}>
                                    {t('qualityControl.viewButton')}
                                  </Link>
                                </Button>
                                {annexDoc && (
                                  <>
                                    <Button asChild size="sm" variant="outline">
                                      <Link href={`/api/documents/annex-xiii/${worksheet.id}`} target="_blank">
                                        <Download className="h-4 w-4 mr-1" />
                                        {t('qualityControl.downloadButton')}
                                      </Link>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        // TODO: Implement email sending
                                        alert(`Send Annex XIII for ${worksheet.worksheetNumber} to ${worksheet.order.dentist.email}`);
                                      }}
                                    >
                                      <Mail className="h-4 w-4 mr-1" />
                                      {t('qualityControl.emailButton')}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
