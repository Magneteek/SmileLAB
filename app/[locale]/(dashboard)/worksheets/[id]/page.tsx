/**
 * Worksheet Detail/Edit Page
 *
 * Displays worksheet details with full information and allows editing
 * if worksheet is in DRAFT status. Shows state transition controls
 * for moving worksheet through the workflow.
 *
 * Features:
 * - View mode for all statuses
 * - Edit mode for DRAFT status only
 * - State transition controls
 * - Full worksheet details with relations
 * - Teeth, products, materials display
 * - Quality control information
 * - Invoice and document links
 *
 * Route: /worksheets/[id]
 */

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { getWorksheetById } from '@/src/lib/services/worksheet-service';
import Link from 'next/link';
import { ArrowLeft, Edit, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorksheetStatusBadge } from '@/src/components/worksheets/WorksheetStatusBadge';
import { StatusTransitionControls } from '@/src/components/worksheets/StatusTransitionControls';
import { WorksheetHistory } from '@/src/components/worksheets/WorksheetHistory';
import { Separator } from '@/components/ui/separator';
import { GenerateInvoiceButton } from '@/src/components/invoices/GenerateInvoiceButton';
import { GenerateAnnexButton } from '@/src/components/documents/GenerateAnnexButton';
import { VoidWorksheetButton } from '@/src/components/worksheets/VoidWorksheetButton';
import { DeleteWorksheetButton } from '@/src/components/worksheets/DeleteWorksheetButton';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function WorksheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations();

  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Await params (Next.js 15+ requirement)
  const { id } = await params;

  // Fetch worksheet
  const worksheet = await getWorksheetById(id);

  if (!worksheet) {
    notFound();
  }

  const isDraft = worksheet.status === 'DRAFT';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Compact Header with All Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Link href="/worksheets">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {worksheet.worksheetNumber}
                  </h1>
                  <WorksheetStatusBadge status={worksheet.status} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailOrderLabel')}</span>{' '}
                    <span className="font-medium">#{worksheet.order.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailCreatedLabel')}</span>{' '}
                    <span className="font-medium">{new Date(worksheet.createdAt).toLocaleDateString()}</span>
                  </div>
                  {worksheet.order.dueDate && (
                    <div>
                      <span className="text-gray-500">{t('worksheet.detailDueLabel')}</span>{' '}
                      <span className="font-medium">{new Date(worksheet.order.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {worksheet.manufactureDate && (
                    <div>
                      <span className="text-gray-500">{t('worksheet.detailManufacturedLabel')}</span>{' '}
                      <span className="font-medium">{new Date(worksheet.manufactureDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailDentistLabel')}</span>{' '}
                    <span className="font-medium">{worksheet.dentist.dentistName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailClinicLabel')}</span>{' '}
                    <span className="font-medium">{worksheet.dentist.clinicName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailPatientLabel')}</span>{' '}
                    <span className="font-medium">{worksheet.patientName || t('worksheet.detailPatientNotAssigned')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('worksheet.detailCreatedByLabel')}</span>{' '}
                    <span className="font-medium">{worksheet.createdBy.name}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isDraft && (
                <Link href={`/worksheets/${worksheet.id}/edit`}>
                  <Button size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('worksheet.detailEditButton')}
                  </Button>
                </Link>
              )}
              <VoidWorksheetButton
                worksheetId={worksheet.id}
                worksheetNumber={worksheet.worksheetNumber}
                currentStatus={worksheet.status}
                orderId={worksheet.orderId}
              />
              <DeleteWorksheetButton
                worksheetId={worksheet.id}
                worksheetNumber={worksheet.worksheetNumber}
                currentStatus={worksheet.status}
                orderId={worksheet.orderId}
              />
              {/* Hide invoice button for TECHNICIAN */}
              {session.user.role !== 'TECHNICIAN' && (
                <GenerateInvoiceButton
                  worksheetId={worksheet.id}
                  worksheetStatus={worksheet.status as any}
                  invoiceId={worksheet.invoiceLineItems?.[0]?.invoice?.id}
                  invoiceStatus={worksheet.invoiceLineItems?.[0]?.invoice?.paymentStatus}
                />
              )}
              <Link href={`/api/documents/worksheet-pdf/${worksheet.id}?locale=sl`} target="_blank">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  {t('worksheet.detailPrintButton')}
                </Button>
              </Link>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Workflow Actions - Integrated */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('worksheet.detailWorkflowActions')}</h3>
            <StatusTransitionControls
              worksheetId={worksheet.id}
              currentStatus={worksheet.status as any}
              userRole={session.user.role as any}
              orderId={worksheet.orderId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid Layout: 75% Products / 25% Info Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products & Materials - 75% (Left) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('worksheet.detailProductsTitle', { count: worksheet.products.length })}</CardTitle>
              <CardDescription>{t('worksheet.detailProductsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {worksheet.products.length === 0 ? (
                <p className="text-gray-500 italic">{t('worksheet.detailNoProductsSelected')}</p>
              ) : (
                <div className="space-y-4">
                  {worksheet.products.map((item: any) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      {/* Product Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">📦</span>
                          </div>
                          <div>
                            <p className="font-semibold text-base">
                              {item.product.code} - {item.product.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {t('worksheet.detailCategoryLabel')} {item.product.category}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {t('worksheet.detailQtyLabel')} {item.quantity} {item.product.unit}
                        </Badge>
                      </div>

                      {/* Product Notes */}
                      {item.notes && (
                        <p className="text-sm text-gray-600 mb-3 pl-11">{item.notes}</p>
                      )}

                      {/* Nested Materials */}
                      {item.productMaterials && item.productMaterials.length > 0 && (
                        <div className="pl-11 space-y-2">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            {t('worksheet.detailMaterialsUsedTitle', { count: item.productMaterials.length })}
                          </p>
                          {item.productMaterials.map((pm: any) => (
                            <div
                              key={pm.id}
                              className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {pm.material.code} - {pm.material.name}
                                  </p>
                                  {pm.materialLot ? (
                                    <Badge variant="default" className="shrink-0 bg-blue-100 text-blue-800 border-blue-200">
                                      {t('worksheet.detailLotLabel')} {pm.materialLot.lotNumber}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300">
                                      {t('worksheet.detailNoLot')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                  <span>{t('worksheet.detailQtyLabel')} {Number(pm.quantityUsed).toFixed(2)} {pm.material.unit}</span>
                                  {pm.toothNumber && <span>{t('worksheet.detailToothLabel')} {pm.toothNumber}</span>}
                                </div>
                                {pm.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{pm.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No materials assigned */}
                      {(!item.productMaterials || item.productMaterials.length === 0) && (
                        <p className="text-sm text-gray-500 italic pl-11">{t('worksheet.detailNoMaterialsAssigned')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Worksheet Information - 25% (Right Sidebar) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Worksheet Information Card */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">{t('worksheet.detailWorksheetInfoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Teeth Display */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">{t('worksheet.detailSelectedTeethTitle', { count: worksheet.teeth.length })}</h4>
                {worksheet.teeth.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">{t('worksheet.detailNoTeethSelected')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {worksheet.teeth.map((tooth: any) => (
                      <Badge key={tooth.id} variant="outline" className="text-xs px-2 py-1">
                        #{tooth.toothNumber} - {tooth.workType}
                        {tooth.shade && ` (${tooth.shade})`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {worksheet.deviceDescription && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm">{t('worksheet.detailDeviceDescriptionTitle')}</h4>
                  <p className="text-sm text-gray-700">{worksheet.deviceDescription}</p>
                </div>
              )}
              {worksheet.intendedUse && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm">{t('worksheet.detailIntendedUseTitle')}</h4>
                  <p className="text-sm text-gray-700">{worksheet.intendedUse}</p>
                </div>
              )}
              {worksheet.technicalNotes && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm">{t('worksheet.detailTechnicalNotesTitle')}</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {worksheet.technicalNotes}
                  </p>
                </div>
              )}
              {worksheet.qcNotes && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm">{t('worksheet.detailQCNotesTitle')}</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {worksheet.qcNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t('worksheet.detailDocumentsTitle', { count: worksheet.documents.length })}</CardTitle>
                  <CardDescription className="text-xs">{t('worksheet.detailDocumentsDescription')}</CardDescription>
                </div>
                {/* Manual Generation Button (only for QC approved with no Annex XIII) */}
                {worksheet.status === 'QC_APPROVED' &&
                 !worksheet.documents.some((d: any) => d.type === 'ANNEX_XIII') && (
                  <GenerateAnnexButton worksheetId={worksheet.id} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {worksheet.documents.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 italic">{t('worksheet.detailNoDocumentsGenerated')}</p>
                  {worksheet.status === 'QC_APPROVED' && (
                    <p className="text-xs text-muted-foreground">
                      {t('worksheet.detailGenerateAnnexPrompt')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {worksheet.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-start justify-between p-2 border rounded hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {doc.type === 'ANNEX_XIII' ? t('worksheet.detailAnnexXIIILabel') : doc.type}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(doc.generatedAt).toLocaleDateString()} •
                            {t('worksheet.detailRetentionUntil', { date: new Date(doc.retentionUntil).toLocaleDateString() })}
                          </p>
                        </div>
                      </div>
                      <Link href={`/api/documents/annex-xiii/${worksheet.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="ml-2 flex-shrink-0">
                          <Printer className="h-3 w-3 mr-1" />
                          {t('worksheet.detailDownloadButton')}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Long Sections */}
      <Tabs defaultValue="quality" className="w-full">
        <TabsList>
          <TabsTrigger value="quality">
            {t('worksheet.detailQCTabTitle', { count: worksheet.qualityControls.length })}
          </TabsTrigger>
          <TabsTrigger value="history">{t('worksheet.detailHistoryTabTitle')}</TabsTrigger>
        </TabsList>

        {/* Quality Control Tab */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>{t('worksheet.detailQCHistoryTitle')}</CardTitle>
              <CardDescription>{t('worksheet.detailQCHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {worksheet.qualityControls.length === 0 ? (
                <p className="text-gray-500 italic">{t('worksheet.detailNoQCRecords')}</p>
              ) : (
                <div className="space-y-3">
                  {worksheet.qualityControls.map((qc: any) => (
                    <div
                      key={qc.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={
                            qc.result === 'APPROVED' ? 'default' :
                            qc.result === 'CONDITIONAL' ? 'secondary' :
                            'destructive'
                          }
                          className={
                            qc.result === 'APPROVED' ? 'bg-green-500' :
                            qc.result === 'CONDITIONAL' ? 'bg-yellow-500' :
                            ''
                          }
                        >
                          {qc.result}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {new Date(qc.inspectionDate).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {t('worksheet.detailInspectorLabel')} {qc.inspector.name}
                      </p>
                      {qc.notes && (
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {qc.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <WorksheetHistory worksheetId={worksheet.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
