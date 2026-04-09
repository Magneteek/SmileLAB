/**
 * Global Email Log Page
 *
 * Shows all sent emails with status, attachments, dentist, and sent-by info.
 * Accessible to ADMIN and INVOICING roles.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailLogTable } from '@/src/components/emails/EmailLogTable';

async function getEmailLogs() {
  const logs = await prisma.emailLog.findMany({
    include: {
      sentBy: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      dentist: { select: { id: true, dentistName: true, clinicName: true } },
      documents: {
        include: {
          document: { select: { id: true, documentNumber: true, worksheetId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return logs.map(log => ({
    ...log,
    invoice: log.invoice
      ? { ...log.invoice, totalAmount: Number(log.invoice.totalAmount) }
      : null,
  }));
}

export default async function EmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!['ADMIN', 'INVOICING'].includes(session.user.role)) redirect('/dashboard');

  const logs = await getEmailLogs();

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-sm font-bold">Evidenca e-pošte</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pregled vseh poslanih e-poštnih sporočil — računi, MDR dokumenti in kombinacije.
        </p>
      </div>
      <EmailLogTable logs={logs} />
    </div>
  );
}
