'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { MaterialForm } from './MaterialForm';
import { MaterialScanButton, ScannedMaterialData } from './MaterialScanButton';
import { QuickAddLotModal } from './QuickAddLotModal';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Type for matched existing material from smart-scan
interface MatchedMaterial {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  type: string;
  unit: string;
}

// Smart scan result type
interface SmartScanResult {
  materialExists: boolean;
  matchedMaterial?: MatchedMaterial;
  extractedData: {
    materialName?: string;
    manufacturer?: string;
    materialType?: string;
    lotNumber?: string;
    expiryDate?: string;
    quantity?: number;
    unit?: string;
  };
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  matchScore?: number;
}

export function MaterialFormClient() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSmartScanning, setIsSmartScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedMaterialData | null>(null);

  // State for smart-scan results
  const [smartScanResult, setSmartScanResult] = useState<SmartScanResult | null>(null);
  const [showMatchedMaterialUI, setShowMatchedMaterialUI] = useState(false);

  // State for post-creation LOT addition
  const [showLotModal, setShowLotModal] = useState(false);
  const [createdMaterial, setCreatedMaterial] = useState<{
    id: string;
    name: string;
    unit: string;
  } | null>(null);

  // Smart matching using Claude AI - sends pre-extracted data from GPT-4 Vision
  const runSmartScan = async (data: ScannedMaterialData): Promise<SmartScanResult | null> => {
    try {
      console.log('🤖 Running smart matching with Claude AI...');
      const response = await fetch('/api/materials/smart-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send pre-extracted data from GPT-4 Vision
          materialName: data.name,
          manufacturer: data.manufacturer,
          materialType: data.type,
          lotNumber: data.lotNumber,
          expiryDate: data.expiryDate,
          quantity: data.quantity,
          unit: data.unit,
          locale,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Smart matching failed:', error);
        return null;
      }

      const result = await response.json();
      if (result.success && result.data) {
        console.log('✅ Smart matching result:', result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error during smart matching:', error);
      return null;
    }
  };

  // Fallback duplicate check when AI smart-scan fails (429/529 errors)
  const runFallbackDuplicateCheck = async (name?: string, manufacturer?: string): Promise<SmartScanResult | null> => {
    try {
      console.log('🔄 Running fallback duplicate check (database only)...');
      const response = await fetch('/api/materials/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, manufacturer }),
      });

      if (!response.ok) {
        console.error('Fallback check failed');
        return null;
      }

      const result = await response.json();
      if (result.success && result.materialExists && result.matchedMaterial) {
        console.log('✅ Fallback found existing material:', result.matchedMaterial);
        return {
          materialExists: true,
          matchedMaterial: result.matchedMaterial,
          extractedData: {},
          confidence: result.confidence || 'medium',
          reasoning: result.reasoning || 'Database match found (AI unavailable)',
          matchScore: result.matchScore,
        };
      }
      return null;
    } catch (error) {
      console.error('Error during fallback check:', error);
      return null;
    }
  };

  const handleScanComplete = async (data: ScannedMaterialData) => {
    console.log('📦 Scanned data received from GPT-4 Vision:', data);
    setScannedData(data);
    setSmartScanResult(null);
    setShowMatchedMaterialUI(false);

    // Run smart matching if we have material name or manufacturer
    if (data.name || data.manufacturer) {
      setIsSmartScanning(true);

      // Send pre-extracted data to Claude for smart matching (SINGLE API call)
      let scanResult = await runSmartScan(data);

      // If smart matching failed (API error, overload, etc.), use fallback database check
      if (!scanResult) {
        console.log('⚠️ Smart matching failed, using fallback database check...');
        scanResult = await runFallbackDuplicateCheck(data.name, data.manufacturer);
      }

      setIsSmartScanning(false);

      if (scanResult) {
        setSmartScanResult(scanResult);

        // If material exists in database, show the match UI
        if (scanResult.materialExists && scanResult.matchedMaterial) {
          console.log('🔍 Found existing material match:', scanResult.matchedMaterial);
          console.log('📊 Match score:', scanResult.matchScore, '| Confidence:', scanResult.confidence);
          setShowMatchedMaterialUI(true);

          toast({
            title: t('material.duplicateFound'),
            description: scanResult.reasoning,
          });
          return;
        }
      }
    }

    toast({
      title: t('scanner.scanComplete'),
      description: t('scanner.dataPrefilled'),
    });
  };

  const handleAddLotToExisting = () => {
    if (!smartScanResult?.matchedMaterial) return;

    // Set the matched material as the target for LOT addition
    setCreatedMaterial({
      id: smartScanResult.matchedMaterial.id,
      name: smartScanResult.matchedMaterial.name,
      unit: smartScanResult.matchedMaterial.unit,
    });
    setShowMatchedMaterialUI(false);
    setShowLotModal(true);
  };

  const handleCreateNewAnyway = () => {
    // User wants to create new material despite duplicate
    setShowMatchedMaterialUI(false);

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

      // API returns material directly, not wrapped in { data: material }
      const material = await response.json();

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
            disabled={isLoading || isSmartScanning}
          />

          {isSmartScanning && (
            <Alert className="flex-1 ml-4">
              <Info className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {t('material.smartScanning')}
              </AlertDescription>
            </Alert>
          )}

          {scannedData && !isSmartScanning && !showMatchedMaterialUI && (
            <Alert className="flex-1 ml-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('scanner.dataScanned')}: {scannedData.name || scannedData.manufacturer || 'Material'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Show AI reasoning if available */}
        {scannedData && scannedData.reasoning && !showMatchedMaterialUI && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('scanner.aiAnalysis')}:</strong> {scannedData.reasoning}
            </AlertDescription>
          </Alert>
        )}

        {/* Matched Material UI - Show when smart-scan finds existing material */}
        {showMatchedMaterialUI && smartScanResult?.matchedMaterial && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-800">{t('material.existingMaterialFound')}</CardTitle>
              </div>
              <CardDescription className="text-amber-700">
                {t('material.existingMaterialFoundDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Material Info */}
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-lg">{smartScanResult.matchedMaterial.name}</span>
                      <Badge variant="outline">{smartScanResult.matchedMaterial.code}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{smartScanResult.matchedMaterial.manufacturer}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t(`material.type${smartScanResult.matchedMaterial.type}` as any)} • {smartScanResult.matchedMaterial.unit}
                    </p>
                  </div>
                  {smartScanResult.matchScore && (
                    <Badge variant="secondary">
                      {smartScanResult.matchScore}% {t('material.matchScore')}
                    </Badge>
                  )}
                </div>

                {/* AI Reasoning */}
                {smartScanResult.reasoning && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">{t('scanner.aiAnalysis')}:</p>
                    <p className="text-sm text-gray-700">{smartScanResult.reasoning}</p>
                    <Badge variant="outline" className="mt-2">
                      {t(`scanner.${smartScanResult.confidence}Confidence`)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Scanned LOT Info (if available) */}
              {(scannedData?.lotNumber || smartScanResult.extractedData.lotNumber) && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">{t('material.scannedLotInfo')}</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    LOT: <span className="font-mono font-semibold">
                      {scannedData?.lotNumber || smartScanResult.extractedData.lotNumber}
                    </span>
                    {(scannedData?.quantity || smartScanResult.extractedData.quantity) &&
                      ` • ${scannedData?.quantity || smartScanResult.extractedData.quantity} ${smartScanResult.matchedMaterial.unit}`}
                    {(scannedData?.expiryDate || smartScanResult.extractedData.expiryDate) &&
                      ` • ${new Date(scannedData?.expiryDate || smartScanResult.extractedData.expiryDate!).toLocaleDateString()}`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCreateNewAnyway}
                  className="w-full sm:flex-1"
                >
                  {t('material.createNewAnyway')}
                </Button>
                <Button
                  onClick={handleAddLotToExisting}
                  className="w-full sm:flex-1"
                >
                  <Package className="mr-2 h-4 w-4" />
                  {t('material.addLotToExisting')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Form - Hide when showing matched material UI */}
        {!showMatchedMaterialUI && (
          <MaterialForm
            initialData={scannedData ? {
              name: scannedData.name,
              manufacturer: scannedData.manufacturer,
              type: scannedData.type,
              unit: scannedData.unit as 'gram' | 'ml' | 'piece' | 'disc' | undefined,
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/materials')}
            isLoading={isLoading}
          />
        )}
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
