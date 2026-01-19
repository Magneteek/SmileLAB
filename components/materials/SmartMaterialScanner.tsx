'use client';

/**
 * Smart Material Scanner Component
 *
 * Intelligent material scanning workflow:
 * 1. Scans material label with camera OCR
 * 2. Uses AI to extract material data and match against database
 * 3. Routes to either:
 *    - Add LOT to existing material (if match found)
 *    - Create new material + LOT (if no match)
 *
 * Features:
 * - Camera-based OCR text reading
 * - AI-powered material matching
 * - Confidence scoring
 * - Smart decision routing
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OCRScanner, OCRResult } from './OCRScanner';
import { QuickAddLotModal } from './QuickAddLotModal';
import {
  Scan,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Package,
  ArrowRight,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SmartScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface MatchedMaterial {
  id: string;
  name: string;
  code: string;
  type: string;
  manufacturer: string;
  unit: string;
}

interface ExtractedData {
  materialName?: string;
  manufacturer?: string;
  materialType?: string;
  lotNumber?: string;
  expiryDate?: string;
  quantity?: number;
  unit?: string;
}

interface SmartScanResult {
  materialExists: boolean;
  matchedMaterial?: MatchedMaterial;
  extractedData: ExtractedData;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  matchScore?: number;
}

export function SmartMaterialScanner({ isOpen, onClose, onSuccess }: SmartScannerProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();

  // Scanner state
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Results state
  const [scanResult, setScanResult] = useState<SmartScanResult | null>(null);
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);

  // Quick add LOT modal state (for existing materials)
  const [showQuickAddLot, setShowQuickAddLot] = useState(false);

  // Handle OCR scan complete
  const handleOCRScan = async (ocr: OCRResult) => {
    console.log('📸 OCR scan complete:', ocr);
    setOcrData(ocr);
    setShowOCRScanner(false);
    setIsAnalyzing(true);

    try {
      // Send to smart scan API
      console.log('🤖 Sending to smart scan API...');
      const response = await fetch('/api/materials/smart-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText: ocr.rawText }),
      });

      if (!response.ok) {
        throw new Error('Smart scan failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      console.log('✅ Smart scan result:', result.data);
      setScanResult(result.data);

    } catch (error: any) {
      console.error('❌ Smart scan error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Could not analyze material. Please try again.',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle "Add LOT to existing material"
  const handleAddLotToExisting = () => {
    setShowQuickAddLot(true);
  };

  // Handle "Create new material"
  const handleCreateNewMaterial = () => {
    // Navigate to material creation form with pre-filled data
    const params = new URLSearchParams();
    if (scanResult?.extractedData.materialName) {
      params.set('name', scanResult.extractedData.materialName);
    }
    if (scanResult?.extractedData.manufacturer) {
      params.set('manufacturer', scanResult.extractedData.manufacturer);
    }
    if (scanResult?.extractedData.materialType) {
      params.set('type', scanResult.extractedData.materialType);
    }
    if (scanResult?.extractedData.unit) {
      params.set('unit', scanResult.extractedData.unit);
    }
    // Also pass LOT data to be added after creation
    if (ocrData?.lotNumber) {
      params.set('lotNumber', ocrData.lotNumber);
    }
    if (ocrData?.expiryDate) {
      params.set('expiryDate', ocrData.expiryDate.toISOString());
    }
    if (ocrData?.quantity) {
      params.set('quantity', ocrData.quantity.toString());
    }

    router.push(`/materials/new?${params.toString()}`);
    onClose();
  };

  // Handle quick add LOT success
  const handleQuickAddSuccess = () => {
    setShowQuickAddLot(false);
    toast({
      title: t('material.toastLotAddedTitle'),
      description: t('material.toastLotAddedDesc'),
    });
    onSuccess?.();
    onClose();
  };

  // Reset state when closing
  const handleClose = () => {
    setScanResult(null);
    setOcrData(null);
    setShowOCRScanner(false);
    setIsAnalyzing(false);
    onClose();
  };

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showOCRScanner && !showQuickAddLot} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Smart Material Scanner
            </DialogTitle>
            <DialogDescription>
              Scan material label to automatically add to inventory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Initial state - no scan yet */}
            {!scanResult && !isAnalyzing && (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Ready to Scan
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Use your camera to scan the material label. AI will automatically identify the material and add it to inventory.
                </p>
                <Button onClick={() => setShowOCRScanner(true)} size="lg">
                  <Scan className="h-5 w-5 mr-2" />
                  Start Camera Scan
                </Button>
              </div>
            )}

            {/* Analyzing state */}
            {isAnalyzing && (
              <div className="text-center py-8">
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Analyzing Material...
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI is processing the label and searching the database
                </p>
              </div>
            )}

            {/* Results state */}
            {scanResult && !isAnalyzing && (
              <div className="space-y-4">
                {/* Confidence indicator */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`${getConfidenceColor(scanResult.confidence)} border`}
                  >
                    {scanResult.confidence.toUpperCase()} Confidence
                    {scanResult.matchScore && ` (${scanResult.matchScore}% match)`}
                  </Badge>
                  {scanResult.confidence === 'low' && (
                    <Badge variant="outline" className="text-yellow-800 bg-yellow-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Review Recommended
                    </Badge>
                  )}
                </div>

                {/* AI Reasoning */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>AI Analysis:</strong> {scanResult.reasoning}
                  </AlertDescription>
                </Alert>

                {/* Material EXISTS - Show matched material */}
                {scanResult.materialExists && scanResult.matchedMaterial && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Material Found in Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Code:</span>
                          <p className="font-semibold">{scanResult.matchedMaterial.code}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-semibold">{scanResult.matchedMaterial.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-semibold">{scanResult.matchedMaterial.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Manufacturer:</span>
                          <p className="font-semibold">{scanResult.matchedMaterial.manufacturer}</p>
                        </div>
                      </div>

                      {/* Show LOT data to be added */}
                      {ocrData && (
                        <div className="pt-3 border-t border-green-200">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            LOT Information to Add:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {ocrData.lotNumber && (
                              <div>
                                <span className="text-muted-foreground">LOT:</span>
                                <p className="font-mono font-semibold">{ocrData.lotNumber}</p>
                              </div>
                            )}
                            {ocrData.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Expiry:</span>
                                <p className="font-semibold">
                                  {ocrData.expiryDate.toLocaleDateString('sl-SI')}
                                </p>
                              </div>
                            )}
                            {ocrData.quantity && (
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <p className="font-semibold">
                                  {ocrData.quantity} {scanResult.matchedMaterial.unit}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <Button onClick={handleAddLotToExisting} className="w-full" size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Add LOT to This Material
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Material DOES NOT EXIST - Show extracted data */}
                {!scanResult.materialExists && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Plus className="h-5 w-5 text-blue-600" />
                        New Material Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        This material is not in the database. Create it now with the information below:
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {scanResult.extractedData.materialName && (
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <p className="font-semibold">{scanResult.extractedData.materialName}</p>
                          </div>
                        )}
                        {scanResult.extractedData.manufacturer && (
                          <div>
                            <span className="text-muted-foreground">Manufacturer:</span>
                            <p className="font-semibold">{scanResult.extractedData.manufacturer}</p>
                          </div>
                        )}
                        {scanResult.extractedData.materialType && (
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <p className="font-semibold">{scanResult.extractedData.materialType}</p>
                          </div>
                        )}
                        {scanResult.extractedData.unit && (
                          <div>
                            <span className="text-muted-foreground">Unit:</span>
                            <p className="font-semibold">{scanResult.extractedData.unit}</p>
                          </div>
                        )}
                      </div>

                      {/* Show LOT data */}
                      {ocrData && (
                        <div className="pt-3 border-t border-blue-200">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            LOT Information (will be added after creation):
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {ocrData.lotNumber && (
                              <div>
                                <span className="text-muted-foreground">LOT:</span>
                                <p className="font-mono font-semibold">{ocrData.lotNumber}</p>
                              </div>
                            )}
                            {ocrData.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Expiry:</span>
                                <p className="font-semibold">
                                  {ocrData.expiryDate.toLocaleDateString('sl-SI')}
                                </p>
                              </div>
                            )}
                            {ocrData.quantity && scanResult.extractedData.unit && (
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <p className="font-semibold">
                                  {ocrData.quantity} {scanResult.extractedData.unit}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <Button onClick={handleCreateNewMaterial} className="w-full" size="lg">
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Create New Material + Add LOT
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Scan again option */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanResult(null);
                      setOcrData(null);
                      setShowOCRScanner(true);
                    }}
                  >
                    Scan Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OCR Scanner Modal */}
      {showOCRScanner && (
        <OCRScanner
          isOpen={showOCRScanner}
          onClose={() => setShowOCRScanner(false)}
          onScan={handleOCRScan}
          title="Scan Material Label"
          description="Position the material label within the frame and capture a clear photo"
        />
      )}

      {/* Quick Add LOT Modal (for existing materials) */}
      {scanResult?.matchedMaterial && ocrData && (
        <QuickAddLotModal
          materialId={scanResult.matchedMaterial.id}
          materialName={scanResult.matchedMaterial.name}
          materialUnit={scanResult.matchedMaterial.unit}
          isOpen={showQuickAddLot}
          onClose={() => setShowQuickAddLot(false)}
          onSuccess={handleQuickAddSuccess}
          // Pre-fill with scanned data
          initialData={{
            lotNumber: ocrData.lotNumber || '',
            expiryDate: ocrData.expiryDate || undefined,
            quantityReceived: ocrData.quantity || undefined,
          }}
        />
      )}
    </>
  );
}
