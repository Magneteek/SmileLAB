'use client';

/**
 * BarcodeScanner Component
 *
 * Camera-based barcode scanner using ZXing library.
 * Detects and decodes barcodes in real-time from device camera.
 *
 * Supports:
 * - GS1-128 (UCC/EAN-128) barcodes
 * - Code 128, Code 39, EAN-13, QR codes
 * - Mobile and desktop cameras
 */

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title,
  description,
}: BarcodeScannerProps) {
  const t = useTranslations('material');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize barcode reader
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure video element is rendered
      const timer = setTimeout(() => {
        initializeScanner();
      }, 200);

      return () => {
        clearTimeout(timer);
        stopScanning();
      };
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError(null);
      console.log('🎥 Initializing scanner...');

      // Create barcode reader instance
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
        console.log('✅ Barcode reader created');
      }

      // Request camera permissions first
      console.log('📷 Requesting camera permissions...');
      await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('✅ Camera permissions granted');

      // Get available camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      console.log(`📹 Found ${videoDevices.length} camera device(s)`);

      if (videoDevices.length === 0) {
        console.error('❌ No camera devices found');
        setError(t('scannerNoCameraError'));
        return;
      }

      setCameraDevices(videoDevices);

      // Prefer back camera on mobile devices
      const backCamera = videoDevices.find((device) =>
        device.label.toLowerCase().includes('back')
      );
      const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
      setSelectedDevice(deviceId);
      console.log(`🎯 Selected camera: ${backCamera?.label || videoDevices[0].label || 'Default camera'}`);

      // Video element should now be available (always rendered)
      if (!videoRef.current) {
        console.error('❌ Video element not found');
        setError('Failed to initialize video element. Please close and try again.');
        return;
      }

      console.log('✅ Video element ready');

      // Start scanning
      await startScanning(deviceId);
    } catch (err) {
      console.error('❌ Scanner initialization error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(t('scannerPermissionDenied'));
        } else if (err.name === 'NotFoundError') {
          setError(t('scannerNoCameraError'));
        } else {
          setError(t('scannerInitError') + ': ' + err.message);
        }
      }
    }
  };

  const startScanning = async (deviceId: string) => {
    if (!videoRef.current) {
      console.error('❌ Video element not ready');
      setError('Video element not ready. Please try again.');
      return;
    }

    if (!codeReaderRef.current) {
      console.error('❌ Barcode reader not initialized');
      setError('Barcode reader not initialized. Please try again.');
      return;
    }

    try {
      console.log('▶️ Starting camera stream...');
      setIsScanning(true);
      setError(null);

      // Start continuous decoding
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            // Successfully decoded barcode
            const barcodeText = result.getText();
            console.log('✅ Barcode scanned:', barcodeText);
            handleScanSuccess(barcodeText);
          }

          if (error && !(error instanceof NotFoundException)) {
            // Log non-NotFoundException errors (NotFoundException is expected when no barcode visible)
            console.error('⚠️ Decode error:', error);
          }
        }
      );
      console.log('✅ Camera stream started successfully');
    } catch (err) {
      console.error('❌ Scanning error:', err);
      setError(t('scannerStartError') + ': ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (barcode: string) => {
    setScannedCode(barcode);
    stopScanning();

    // Brief delay to show success state, then callback
    setTimeout(() => {
      onScan(barcode);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    stopScanning();
    setScannedCode(null);
    setError(null);
    onClose();
  };

  const handleDeviceChange = (deviceId: string) => {
    stopScanning();
    setSelectedDevice(deviceId);
    startScanning(deviceId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title || t('scannerTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {/* Camera Selection (if multiple cameras) */}
          {cameraDevices.length > 1 && !scannedCode && !error && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('scannerSelectCamera')}:</label>
              <select
                value={selectedDevice || ''}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {cameraDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Camera Video Feed */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Always render video element when dialog is open so ref is available */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
              autoPlay
              playsInline
              muted
            />

            {/* Scanning Overlay */}
            {isScanning && !scannedCode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Scanning frame */}
                <div className="relative w-3/4 h-1/2 border-4 border-blue-500 rounded-lg">
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white" />

                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-blue-500 animate-scan" />
                </div>

                <p className="mt-4 text-white text-sm font-medium bg-black/50 px-4 py-2 rounded">
                  {t('scannerInstructions')}
                </p>
              </div>
            )}

            {/* Success State */}
            {scannedCode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/90">
                <CheckCircle2 className="h-16 w-16 text-white mb-4" />
                <p className="text-white text-lg font-semibold">{t('scannerSuccess')}</p>
                <p className="text-white/90 text-sm mt-2 font-mono">{scannedCode}</p>
              </div>
            )}

            {/* Loading State */}
            {!isScanning && !error && !scannedCode && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          {isScanning && !scannedCode && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {t('scannerTip1')}</p>
              <p>• {t('scannerTip2')}</p>
              <p>• {t('scannerTip3')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              {t('scannerCloseButton')}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* CSS for scanning animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }

        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </Dialog>
  );
}
