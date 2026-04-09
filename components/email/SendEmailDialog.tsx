'use client';

/**
 * SendEmailDialog
 *
 * Reusable dialog for sending emails with optional invoice and/or MDR documents.
 * Supports: invoice only, MDR doc(s) only, or both in one email.
 *
 * Usage:
 *   <SendEmailDialog
 *     dentistId="..."
 *     dentistName="dr. Novak"
 *     dentistEmail="dr.novak@klinika.si"
 *     invoice={{ id, invoiceNumber, totalAmount }}   // optional
 *     documents={[{ id, documentNumber, worksheetNumber }]}  // optional
 *     open={open}
 *     onOpenChange={setOpen}
 *     onSuccess={() => refresh()}
 *   />
 */

import { useState, useEffect, useRef } from 'react';
import { Mail, FileText, Receipt, X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
}

export interface EmailDocument {
  id: string;
  documentNumber: string;
  worksheetNumber: string;
}

export interface SendEmailDialogProps {
  dentistId: string;
  dentistName: string;
  dentistEmail: string | null;
  invoice?: EmailInvoice | null;
  documents?: EmailDocument[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SendEmailDialog({
  dentistId,
  dentistName,
  dentistEmail,
  invoice,
  documents = [],
  open,
  onOpenChange,
  onSuccess,
}: SendEmailDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState(dentistEmail || '');
  const [includeInvoice, setIncludeInvoice] = useState(!!invoice);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(
    new Set(documents.map(d => d.id))
  );
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top when result appears
  useEffect(() => {
    if (result) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [result]);

  // Reset state only when dialog transitions from closed → open
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setRecipientEmail(dentistEmail || '');
      setIncludeInvoice(!!invoice);
      setSelectedDocIds(new Set(documents.map(d => d.id)));
      setCustomNote('');
      setResult(null);
      setErrorMessage('');
    }
    prevOpenRef.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDoc = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canSend = recipientEmail.trim() !== '' &&
    (includeInvoice || selectedDocIds.size > 0);

  const attachmentCount = (includeInvoice ? 1 : 0) + selectedDocIds.size;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    setErrorMessage('');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          dentistId,
          invoiceId: includeInvoice && invoice ? invoice.id : undefined,
          documentIds: Array.from(selectedDocIds),
          customNote: customNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResult('error');
        setErrorMessage(data.error || 'Napaka pri pošiljanju');
      } else {
        setResult('success');
        onSuccess?.();
      }
    } catch (e: any) {
      setResult('error');
      setErrorMessage(e.message || 'Napaka pri pošiljanju');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold">Pošlji e-pošto</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Success state — replace form */}
          {result === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">E-pošta poslana</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sporočilo je bilo uspešno poslano na <strong>{recipientEmail}</strong>.
                </p>
              </div>
            </div>
          ) : (
          <>
          {result === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Recipient */}
          <div className="space-y-1.5">
            <Label htmlFor="email-recipient" className="text-sm font-medium">
              Prejemnik
            </Label>
            <div className="text-xs text-muted-foreground mb-1">{dentistName}</div>
            <Input
              id="email-recipient"
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="e-mail@primer.si"
              disabled={sending}
            />
          </div>

          <Separator />

          {/* Invoice */}
          {invoice && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Račun</Label>
              <div
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  includeInvoice ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => !sending && setIncludeInvoice(v => !v)}
              >
                <Checkbox
                  checked={includeInvoice}
                  onCheckedChange={(v) => setIncludeInvoice(!!v)}
                  disabled={sending}
                />
                <Receipt className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">€{Number(invoice.totalAmount).toFixed(2)}</div>
                </div>
                {includeInvoice && <Badge variant="secondary" className="text-xs shrink-0">Vključen</Badge>}
              </div>
            </div>
          )}

          {/* MDR Documents */}
          {documents.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">MDR dokumenti (Annex XIII)</Label>
              <div className="space-y-2">
                {documents.map(doc => {
                  const selected = selectedDocIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selected ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => !sending && toggleDoc(doc.id)}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleDoc(doc.id)}
                        disabled={sending}
                      />
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{doc.documentNumber}</div>
                        <div className="text-xs text-muted-foreground">{doc.worksheetNumber}</div>
                      </div>
                      {selected && <Badge variant="secondary" className="text-xs shrink-0 bg-green-100 text-green-700">Vključen</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom note */}
          <div className="space-y-1.5">
            <Label htmlFor="email-note" className="text-sm font-medium">
              Sporočilo <span className="text-muted-foreground font-normal">(neobvezno)</span>
            </Label>
            <Textarea
              id="email-note"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="Kratka opomba, ki bo dodana k e-pošti..."
              rows={3}
              disabled={sending}
              className="resize-none text-sm"
            />
          </div>

          {/* Attachment summary */}
          {canSend && (
            <div className="text-xs text-muted-foreground bg-gray-50 rounded-md px-3 py-2">
              Priponke: <strong>{attachmentCount}</strong> {attachmentCount === 1 ? 'datoteka' : 'datoteke'}
              {includeInvoice && invoice && ` · ${invoice.invoiceNumber}.pdf`}
              {Array.from(selectedDocIds).map(id => {
                const d = documents.find(x => x.id === id);
                return d ? ` · ${d.documentNumber}.pdf` : '';
              })}
            </div>
          )}
          </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          {result === 'success' ? (
            <Button onClick={() => onOpenChange(false)}>Zapri</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Prekliči
              </Button>
              <Button onClick={handleSend} disabled={!canSend || sending} className="gap-2">
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Pošiljam...</>
                ) : (
                  <><Send className="h-4 w-4" />Pošlji</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
