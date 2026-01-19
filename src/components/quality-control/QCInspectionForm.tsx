/**
 * Quality Control Inspection Form Component
 *
 * Provides QC checklist interface for inspecting worksheets
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorksheetForInspection {
  id: string;
  worksheetNumber: string;
  status: string;
  patientName: string | null;
  deviceDescription: string | null;
  intendedUse: string | null;
  technicalNotes: string | null;
  manufactureDate: Date | null;
  createdAt: Date;
  order: {
    id: string;
    orderNumber: string;
    dentist: {
      id: string;
      dentistName: string;
      clinicName: string | null;
      licenseNumber: string | null;
      email: string;
      phone: string | null;
    };
  };
  teeth: Array<{
    id: string;
    toothNumber: string;
    workType: string;
    shade: string | null;
    notes: string | null;
  }>;
  products: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      category: string;
      code: string;
    };
    productMaterials: Array<{
      id: string;
      quantityUsed: number;
      toothNumber: string | null;
      notes: string | null;
      material: {
        id: string;
        name: string;
        code: string;
        unit: string;
      };
      materialLot: {
        id: string;
        lotNumber: string;
        expiryDate: Date | null;
      } | null;
    }>;
  }>;
  materials: Array<{
    id: string;
    quantityPlanned: number;
    material: {
      id: string;
      name: string;
      type: string;
      code: string;
      manufacturer: string | null;
    };
    materialLot: {
      id: string;
      lotNumber: string;
      expiryDate: Date | null;
      arrivalDate: Date;
      quantityReceived: number;
      quantityAvailable: number;
    } | null;
  }>;
  qualityControls: Array<{
    id: string;
    result: string;
    aesthetics: boolean | null;
    fit: boolean | null;
    occlusion: boolean | null;
    shade: boolean | null;
    margins: boolean | null;
    notes: string | null;
    actionRequired: string | null;
    inspector: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  createdBy: {
    id: string;
    name: string;
  };
}

interface QCInspectionFormProps {
  worksheet: WorksheetForInspection;
  inspectorId: string;
  inspectorName: string;
}

// ============================================================================
// FORM SCHEMA
// ============================================================================

const qcFormSchema = z.object({
  aesthetics: z.boolean(),
  fit: z.boolean(),
  occlusion: z.boolean(),
  shade: z.boolean(),
  margins: z.boolean(),
  notes: z.string().optional(),
  actionRequired: z.string().optional(),
  // EU MDR Annex XIII Compliance Fields
  emdnCode: z.string().min(1, 'EMDN code is required'),
  riskClass: z.string().min(1, 'Risk class is required'),
  annexIDeviations: z.string().optional(),
  documentVersion: z.string().min(1, 'Document version is required'),
});

type QCFormData = z.infer<typeof qcFormSchema>;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QCInspectionForm({
  worksheet,
  inspectorId,
  inspectorName,
}: QCInspectionFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'APPROVED' | 'REJECTED' | 'CONDITIONAL' | null>(null);

  // Get the latest QC record if exists
  const latestQC = worksheet.qualityControls?.[0] || null;

  // Initialize form with existing QC data if available
  const form = useForm<QCFormData>({
    resolver: zodResolver(qcFormSchema),
    defaultValues: {
      aesthetics: latestQC?.aesthetics ?? false,
      fit: latestQC?.fit ?? false,
      occlusion: latestQC?.occlusion ?? false,
      shade: latestQC?.shade ?? false,
      margins: latestQC?.margins ?? false,
      notes: latestQC?.notes ?? '',
      actionRequired: latestQC?.actionRequired ?? '',
      // EU MDR Annex XIII Compliance Fields
      emdnCode: 'Q010206 - Dental Prostheses',
      riskClass: 'Class IIa',
      annexIDeviations: '',
      documentVersion: '1.0',
    },
  });

  const { watch, setValue } = form;
  const formValues = watch();

  // Calculate passed checks
  const passedChecks = [
    formValues.aesthetics,
    formValues.fit,
    formValues.occlusion,
    formValues.shade,
    formValues.margins,
  ].filter(Boolean).length;

  // Check if all checkboxes are checked
  const allChecked = passedChecks === 5;

  // Handle "Check All" toggle
  const handleCheckAll = (checked: boolean) => {
    setValue('aesthetics', checked);
    setValue('fit', checked);
    setValue('occlusion', checked);
    setValue('shade', checked);
    setValue('margins', checked);
  };

  // Handle decision button click
  const handleDecision = (decision: 'APPROVED' | 'REJECTED' | 'CONDITIONAL') => {
    setPendingDecision(decision);

    // Validation
    if (decision === 'APPROVED' && passedChecks !== 5) {
      toast({
        title: t('qualityControl.validationError'),
        description: t('qualityControl.validationApprovedAllChecks'),
        variant: 'destructive',
      });
      return;
    }

    if (decision === 'CONDITIONAL') {
      if (passedChecks < 4) {
        toast({
          title: t('qualityControl.validationError'),
          description: t('qualityControl.validationConditionalMinChecks'),
          variant: 'destructive',
        });
        return;
      }
      if (!formValues.notes || formValues.notes.trim().length === 0) {
        toast({
          title: t('qualityControl.validationError'),
          description: t('qualityControl.validationConditionalNotes'),
          variant: 'destructive',
        });
        return;
      }
    }

    if (decision === 'REJECTED') {
      if (passedChecks === 5) {
        toast({
          title: t('qualityControl.validationError'),
          description: t('qualityControl.validationRejectedAtLeastOne'),
          variant: 'destructive',
        });
        return;
      }
      if (!formValues.actionRequired || formValues.actionRequired.trim().length === 0) {
        toast({
          title: t('qualityControl.validationError'),
          description: t('qualityControl.validationRejectedActionRequired'),
          variant: 'destructive',
        });
        return;
      }
    }

    setShowConfirmDialog(true);
  };

  // Submit QC inspection
  const submitInspection = async () => {
    if (!pendingDecision) return;

    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const response = await fetch(`/api/quality-control/${worksheet.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aesthetics: formValues.aesthetics,
          fit: formValues.fit,
          occlusion: formValues.occlusion,
          shade: formValues.shade,
          margins: formValues.margins,
          result: pendingDecision,
          notes: formValues.notes,
          actionRequired: formValues.actionRequired,
          // EU MDR Annex XIII Compliance Fields
          emdnCode: formValues.emdnCode,
          riskClass: formValues.riskClass,
          annexIDeviations: formValues.annexIDeviations,
          documentVersion: formValues.documentVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit QC inspection');
      }

      const data = await response.json();

      toast({
        title: t('qualityControl.qcInspectionCompleted'),
        description: data.message || t('qualityControl.worksheetStatusSuccess', { decision: pendingDecision.toLowerCase() }),
      });

      // Redirect to QC dashboard
      router.push('/quality-control');
      router.refresh();
    } catch (error) {
      console.error('QC submission error:', error);
      toast({
        title: t('qualityControl.submissionFailed'),
        description: error instanceof Error ? error.message : 'Failed to submit QC inspection',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 60/40 Grid Layout - Form Left, Details Right */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
        {/* Left Column (60%): QC Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('qualityControl.qualityControlChecklistTitle')}</CardTitle>
            <CardDescription>
              {t('qualityControl.qualityControlChecklistDescription', { passedChecks })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: EU MDR Compliance, Notes, and Buttons */}
              <div className="space-y-4">
                {/* EU MDR Compliance Fields */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">{t('qualityControl.euMdrComplianceTitle')}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('qualityControl.euMdrComplianceDescription')}
                    </p>
                  </div>

                  {/* EMDN Code */}
                  <div className="space-y-2">
                    <Label htmlFor="emdnCode">
                      {t('qualityControl.emdnCodeLabel')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="emdnCode"
                      value={formValues.emdnCode}
                      onChange={(e) => setValue('emdnCode', e.target.value)}
                      placeholder={t('qualityControl.emdnCodePlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('qualityControl.emdnCodeDescription')}
                    </p>
                  </div>

                  {/* Risk Class */}
                  <div className="space-y-2">
                    <Label htmlFor="riskClass">
                      {t('qualityControl.riskClassLabel')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="riskClass"
                      value={formValues.riskClass}
                      onChange={(e) => setValue('riskClass', e.target.value)}
                      placeholder={t('qualityControl.riskClassPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('qualityControl.riskClassDescription')}
                    </p>
                  </div>

                  {/* Annex I Deviations */}
                  <div className="space-y-2">
                    <Label htmlFor="annexIDeviations">
                      {t('qualityControl.annexIDeviationsLabel')}
                    </Label>
                    <Textarea
                      id="annexIDeviations"
                      value={formValues.annexIDeviations}
                      onChange={(e) => setValue('annexIDeviations', e.target.value)}
                      placeholder={t('qualityControl.annexIDeviationsPlaceholder')}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('qualityControl.annexIDeviationsDescription')}
                    </p>
                  </div>

                  {/* Document Version */}
                  <div className="space-y-2">
                    <Label htmlFor="documentVersion">
                      {t('qualityControl.documentVersionLabel')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="documentVersion"
                      value={formValues.documentVersion}
                      onChange={(e) => setValue('documentVersion', e.target.value)}
                      placeholder={t('qualityControl.documentVersionPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('qualityControl.documentVersionDescription')}
                    </p>
                  </div>
                </div>

                {/* Inspector Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">{t('qualityControl.inspectorNotesLabel')}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t('qualityControl.inspectorNotesPlaceholder')}
                    value={formValues.notes}
                    onChange={(e) => setValue('notes', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Action Required (for rejection) */}
                <div className="space-y-2">
                  <Label htmlFor="actionRequired">
                    {t('qualityControl.actionRequiredLabel')}
                  </Label>
                  <Textarea
                    id="actionRequired"
                    placeholder={t('qualityControl.actionRequiredPlaceholder')}
                    value={formValues.actionRequired}
                    onChange={(e) => setValue('actionRequired', e.target.value)}
                    rows={2}
                    className={
                      pendingDecision === 'REJECTED' && !formValues.actionRequired
                        ? 'border-red-500'
                        : ''
                    }
                  />
                </div>

                {/* Decision Buttons - Inline in 1 Row */}
                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/quality-control')}
                    disabled={isSubmitting}
                    size="sm"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {t('qualityControl.backToDashboard')}
                  </Button>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleDecision('APPROVED')}
                    disabled={isSubmitting || passedChecks !== 5}
                    size="sm"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    {t('qualityControl.approveButton')}
                  </Button>
                  <Button
                    variant="default"
                    className="bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => handleDecision('CONDITIONAL')}
                    disabled={isSubmitting || passedChecks < 4}
                    size="sm"
                  >
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {t('qualityControl.conditionalApproveButton')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDecision('REJECTED')}
                    disabled={isSubmitting || passedChecks === 5}
                    size="sm"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    {t('qualityControl.rejectButton')}
                  </Button>
                </div>
              </div>

              {/* Right Column: Quality Control Checklist */}
              <div className="space-y-4">
                {/* Check All Checkbox */}
                <div className="flex items-start space-x-3 pb-3 border-b">
                  <Checkbox
                    id="checkAll"
                    checked={allChecked}
                    onCheckedChange={handleCheckAll}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="checkAll"
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.checkAllLabel')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.checkAllDescription')}
                    </p>
                  </div>
                </div>

                {/* Individual Checkboxes */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="aesthetics"
                    checked={formValues.aesthetics}
                    onCheckedChange={(checked) => setValue('aesthetics', checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="aesthetics"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.aestheticsTitle')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.aestheticsDescription')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="fit"
                    checked={formValues.fit}
                    onCheckedChange={(checked) => setValue('fit', checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="fit"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.fitTitle')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.fitDescription')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="occlusion"
                    checked={formValues.occlusion}
                    onCheckedChange={(checked) => setValue('occlusion', checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="occlusion"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.occlusionTitle')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.occlusionDescription')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="shade"
                    checked={formValues.shade}
                    onCheckedChange={(checked) => setValue('shade', checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="shade"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.shadeTitle')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.shadeDescription')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="margins"
                    checked={formValues.margins}
                    onCheckedChange={(checked) => setValue('margins', checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="margins"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('qualityControl.marginsTitle')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('qualityControl.marginsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column (40%): Worksheet Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('qualityControl.worksheetDetailsTitle')}</CardTitle>
            <CardDescription>{t('qualityControl.worksheetDetailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Number, Patient, Worksheet Number, Dentist - In One Row */}
            <div className="flex items-baseline gap-4 text-sm pb-3 border-b">
              <div className="flex items-baseline gap-1.5">
                <Label className="text-muted-foreground text-xs">{t('qualityControl.orderNumber')}</Label>
                <div className="font-semibold">{worksheet.order.orderNumber}</div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <Label className="text-muted-foreground text-xs">{t('qualityControl.patient')}</Label>
                <div className="font-semibold">{worksheet.patientName || t('qualityControl.notAvailable')}</div>
              </div>
            </div>

            <div className="flex items-baseline gap-4 text-sm pb-3 border-b">
              <div className="flex items-baseline gap-1.5">
                <Label className="text-muted-foreground text-xs">{t('qualityControl.worksheetNumber')}</Label>
                <div className="font-medium">{worksheet.worksheetNumber}</div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <Label className="text-muted-foreground text-xs">{t('qualityControl.dentist')}</Label>
                <div className="font-medium">{worksheet.order.dentist.dentistName}</div>
              </div>
            </div>

            {/* Products with Nested Materials - Compact */}
            <div>
              <Label className="text-muted-foreground text-sm">
                {t('qualityControl.productsAndMaterials', { count: worksheet.products.length })}
              </Label>
              <div className="mt-2 space-y-2">
                {worksheet.products.map((wp) => (
                  <div key={wp.id} className="border rounded p-2 bg-gray-50">
                    {/* Product Header - Compact */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">📦</span>
                        <span className="font-semibold">{wp.product.code} - {wp.product.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t('qualityControl.qty')}: {wp.quantity}
                      </Badge>
                    </div>

                    {/* Nested Materials - Compact */}
                    {wp.productMaterials && wp.productMaterials.length > 0 && (
                      <div className="pl-6 mt-1 space-y-1">
                        {wp.productMaterials.map((pm) => (
                          <div key={pm.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{pm.material.code}</span>
                            <span>-</span>
                            <span>{pm.material.name}</span>
                            {pm.materialLot && (
                              <Badge variant="secondary" className="text-xs">
                                LOT: {pm.materialLot.lotNumber}
                              </Badge>
                            )}
                            <span>({Number(pm.quantityUsed).toFixed(2)} {pm.material.unit})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Teeth */}
            {worksheet.teeth.length > 0 && (
              <div>
                <Label className="text-muted-foreground text-sm">{t('qualityControl.teethFdiNotation')}</Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {worksheet.teeth.map((tooth) => (
                    <Badge key={tooth.id} variant="secondary" className="text-xs">
                      {tooth.toothNumber} - {t(`fdi.workTypes.${tooth.workType}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Notes */}
            {worksheet.technicalNotes && (
              <div>
                <Label className="text-muted-foreground text-sm">{t('qualityControl.technicalNotes')}</Label>
                <div className="mt-1 text-sm">{worksheet.technicalNotes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qualityControl.confirmQcDecision')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision === 'APPROVED' && t('qualityControl.confirmApprovalMessage')}
              {pendingDecision === 'CONDITIONAL' && t('qualityControl.confirmConditionalMessage')}
              {pendingDecision === 'REJECTED' && t('qualityControl.confirmRejectionMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t('qualityControl.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={submitInspection} disabled={isSubmitting}>
              {isSubmitting ? t('qualityControl.submitting') : t('qualityControl.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
