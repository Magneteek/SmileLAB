'use client';

/**
 * Product Import Dialog
 * Allows CSV file upload for bulk product import
 * Supports drag & drop and file selection
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  products: Array<{
    code: string;
    name: string;
    status: 'created' | 'updated' | 'error';
    error?: string;
  }>;
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ProductImportDialogProps) {
  const t = useTranslations('pricing');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    } else {
      setError(t('importErrorInvalidFile'));
    }
  }, [t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);

      // If successful, notify parent to refresh
      if (data.created > 0 || data.updated > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    const template = 'Code,Name,Description,Category,Price,Unit\n,Example Product,Description here,CROWN,150.00,KOS\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('importTitle')}</DialogTitle>
          <DialogDescription>
            {t('importDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FileText className="h-4 w-4" />
              <span>{t('importTemplateHint')}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {t('downloadTemplate')}
            </Button>
          </div>

          {/* Drop Zone */}
          {!result && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-300',
                file ? 'border-green-500 bg-green-50' : ''
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    {t('chooseAnother')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="font-medium">{t('dropZoneTitle')}</p>
                  <p className="text-sm text-gray-500">{t('dropZoneSubtitle')}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-3">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('importResultSummary', {
                    created: result.created,
                    updated: result.updated,
                    errors: result.errors.length,
                  })}
                </AlertDescription>
              </Alert>

              {/* Detailed Results */}
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">{t('code')}</th>
                      <th className="px-3 py-2 text-left">{t('productName')}</th>
                      <th className="px-3 py-2 text-left">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.products.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">
                          {p.status === 'created' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('created')}
                            </span>
                          )}
                          {p.status === 'updated' && (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('updated')}
                            </span>
                          )}
                          {p.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-red-600" title={p.error}>
                              <XCircle className="h-3 w-3" />
                              {t('error')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error List */}
              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="font-medium text-red-800 mb-2">{t('importErrors')}:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? t('close') : t('cancel')}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('import')}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
