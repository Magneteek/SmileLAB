/**
 * POST /api/retroactive-doc
 * Generates an Annex XIII PDF from manually entered data (no DB worksheet needed).
 * Used for generating compliance documents from paper worksheets.
 * Returns the PDF as a file download.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLabConfigurationOrThrow } from '@/lib/services/lab-configuration-service';
import { generateAnnexXIIIFromData } from '@/lib/pdf/annex-xiii-generator';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const body = await request.json();
    const labConfig = await getLabConfigurationOrThrow();

    // Load Slovenian translations (retroactive docs are always in SL)
    const messagesPath = path.join(process.cwd(), 'messages', 'sl.json');
    const messagesContent = await fs.readFile(messagesPath, 'utf-8');
    const messages = JSON.parse(messagesContent);
    const t = messages.annexPdf || {};

    // Process placeholder translations
    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 10);
    const retentionFormatted = retentionUntil.toLocaleDateString('sl-SI', { day: '2-digit', month: 'long', year: 'numeric' });

    const processedT = { ...t };
    if (processedT.declarationIntro) processedT.declarationIntro = processedT.declarationIntro.replace('{laboratoryName}', labConfig.laboratoryName);
    if (processedT.retentionNotice) processedT.retentionNotice = processedT.retentionNotice.replace('{retentionUntil}', retentionFormatted);
    if (processedT.generatedBy) processedT.generatedBy = processedT.generatedBy.replace('{generatedBy}', session.user.name ?? 'Admin');

    // Convert logo/signature to base64 if present
    async function toBase64(filePath: string | null | undefined): Promise<string | null> {
      if (!filePath) return null;
      try {
        const abs = filePath.startsWith('/') ? path.join(process.cwd(), 'public', filePath.slice(1)) : path.join(process.cwd(), filePath);
        const buf = await fs.readFile(abs);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
      } catch { return null; }
    }

    const logoBase64 = await toBase64(labConfig.logoPath);
    const signatureBase64 = await toBase64(labConfig.signaturePath);

    const documentDate = body.documentDate ? new Date(body.documentDate) : new Date();
    const generationDate = documentDate.toLocaleDateString('sl-SI', { day: '2-digit', month: 'long', year: 'numeric' });

    const data = {
      documentId: `MDR-${body.worksheetNumber}`,
      worksheetNumber: body.worksheetNumber,
      generationDate,
      retentionUntil: retentionFormatted,
      generatedBy: session.user.name ?? 'Admin',

      lab: {
        laboratoryName: labConfig.laboratoryName,
        laboratoryId: labConfig.laboratoryId,
        laboratoryLicense: labConfig.laboratoryLicense,
        registrationNumber: labConfig.registrationNumber,
        taxId: labConfig.taxId,
        street: labConfig.street,
        city: labConfig.city,
        postalCode: labConfig.postalCode,
        country: labConfig.country || 'Slovenia',
        phone: labConfig.phone,
        email: labConfig.email,
        website: labConfig.website,
        logoPath: logoBase64,
        signaturePath: signatureBase64,
        bankAccount: labConfig.bankAccounts?.[0]?.iban ?? null,
        bankSwift: labConfig.bankAccounts?.[0]?.swiftBic ?? null,
        responsiblePersonName: labConfig.responsiblePersonName,
        responsiblePersonTitle: labConfig.responsiblePersonTitle,
        responsiblePersonLicense: labConfig.responsiblePersonLicense,
        responsiblePersonEmail: labConfig.responsiblePersonEmail,
        responsiblePersonPhone: labConfig.responsiblePersonPhone,
      },

      deviceDescription: body.deviceDescription || 'Po meri izdelana zobna naprava',
      intendedUse: body.intendedUse || 'Zobna restavracija',
      manufactureDate: body.manufactureDate
        ? new Date(body.manufactureDate).toLocaleDateString('sl-SI', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('sl-SI', { day: '2-digit', month: 'long', year: 'numeric' }),
      deliveryDate: null,
      patientName: body.patientName || 'Zaupno',
      orderNumber: body.worksheetNumber.replace(/[^0-9]/g, ''),

      dentist: {
        name: body.dentistName || '',
        licenseNumber: body.dentistLicense || null,
        clinicName: body.clinicName || '',
        address: body.dentistAddress || null,
        city: body.dentistCity || null,
        postalCode: body.dentistPostalCode || null,
        email: body.dentistEmail || '',
        phone: body.dentistPhone || '',
      },

      products: (body.products || []).map((p: any) => ({
        code: p.code || 'CUSTOM',
        name: p.name,
        quantity: p.quantity || 1,
        teeth: p.teeth || '',
      })),

      materials: (body.materials || []).map((m: any) => ({
        code: m.code || 'MAT',
        name: m.name,
        manufacturer: m.manufacturer || '',
        lotNumber: m.lotNumber || null,
        expiryDate: m.expiryDate || null,
        quantityUsed: String(m.quantity || ''),
        unit: m.unit || 'g',
        toothNumber: null,
        ceMarking: m.ceMarking ?? true,
        biocompatible: m.biocompatible ?? true,
        productName: m.productName || 'General',
      })),

      qcInspection: body.qcDate ? {
        inspectorName: body.qcInspector || labConfig.responsiblePersonName,
        inspectionDate: new Date(body.qcDate).toLocaleDateString('sl-SI', { day: '2-digit', month: 'long', year: 'numeric' }),
        result: 'APPROVED',
        resultTranslated: 'Odobreno',
        notes: body.qcNotes || null,
        emdnCode: 'Q010206 - Dental Prostheses',
        riskClass: 'Class IIa',
        annexIDeviations: null,
        documentVersion: '1.0',
      } : undefined,

      t: processedT,
    };

    const pdfBuffer = await generateAnnexXIIIFromData(data);

    // Also save a copy to documents/annex-xiii/ folder for archiving
    const docsDir = path.join(process.cwd(), 'documents', 'annex-xiii');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, `MDR-${body.worksheetNumber}.pdf`), pdfBuffer);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="MDR-${body.worksheetNumber}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Retroactive doc generation failed:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
