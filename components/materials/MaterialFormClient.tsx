'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MaterialForm } from './MaterialForm';
import { MaterialScanButton, ScannedMaterialData } from './MaterialScanButton';
import { QuickAddLotModal } from './QuickAddLotModal';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MaterialFormClient() {
  const router = useRouter();
  const t = useTranslations();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedMaterialData | null>(null);

  // State for post-creation LOT addition
  const [showLotModal, setShowLotModal] = useState(false);
  const [createdMaterial, setCreatedMaterial] = useState<{
    id: string;
    name: string;
    unit: string;
  } | null>(null);

  const handleScanComplete = (data: ScannedMaterialData) => {
    console.log('📦 Scanned data received:', data);
    setScannedData(data);

    toast({
      title: t('scanner.scanComplete'),
      description: t('scanner.dataPrefilled'),
    });
  };

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create material');
      }

      const result = await response.json();
      const material = result.data;

      toast({
        title: t('material.toastCreateSuccessTitle'),
        description: t('material.toastCreateSuccessDesc')
      });

      // Store created material for LOT addition
      setCreatedMaterial({
        id: material.id,
        name: material.name,
        unit: material.unit,
      });

      // If we have scanned LOT data, show the LOT modal
      if (scannedData?.lotNumber) {
        setShowLotModal(true);
      } else {
        // Otherwise, just go back to materials list
        router.push('/materials');
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: t('material.toastCreateErrorTitle'),
        description: error instanceof Error ? error.message : t('material.toastCreateErrorDesc'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLotModalClose = () => {
    setShowLotModal(false);
    // Navigate back to materials list
    router.push('/materials');
    router.refresh();
  };

  const handleLotSuccess = () => {
    setShowLotModal(false);
    toast({
      title: t('material.toastLotAddedTitle'),
      description: t('material.toastLotAddedDesc'),
    });
    // Navigate back to materials list
    router.push('/materials');
    router.refresh();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Scan Button */}
        <div className="flex items-center justify-between">
          <MaterialScanButton
            onScanComplete={handleScanComplete}
            disabled={isLoading}
          />

          {scannedData && (
            <Alert className="flex-1 ml-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('scanner.dataScanned')}: {scannedData.name || scannedData.manufacturer || 'Material'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Show AI reasoning if available */}
        {scannedData && scannedData.reasoning && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('scanner.aiAnalysis')}:</strong> {scannedData.reasoning}
            </AlertDescription>
          </Alert>
        )}

        {/* Material Form */}
        <MaterialForm
          initialData={scannedData ? {
            name: scannedData.name,
            manufacturer: scannedData.manufacturer,
            type: scannedData.type,
            unit: scannedData.unit,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/materials')}
          isLoading={isLoading}
        />
      </div>

      {/* LOT Addition Modal */}
      {createdMaterial && (
        <QuickAddLotModal
          materialId={createdMaterial.id}
          materialName={createdMaterial.name}
          materialUnit={createdMaterial.unit}
          isOpen={showLotModal}
          onClose={handleLotModalClose}
          initialData={scannedData ? {
            lotNumber: scannedData.lotNumber,
            expiryDate: scannedData.expiryDate,
            quantityReceived: scannedData.quantity,
          } : undefined}
          onSuccess={handleLotSuccess}
        />
      )}
    </>
  );
}
