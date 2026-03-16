/**
 * Email Inbox Service
 *
 * Polls multiple inboxes via IMAP:
 *   - 3d@dentro.si  → MeditLink notifications
 *   - info@dentro.si → Shining 3D notifications
 *
 * Parses incoming case emails and auto-creates draft Order + Worksheet entries.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';

// ─── Inbox configs ────────────────────────────────────────────────────────────

interface InboxConfig {
  user: string;
  pass: string;
}

function getInboxConfigs(): InboxConfig[] {
  const configs: InboxConfig[] = [];
  if (process.env.EMAIL_INBOX_USER && process.env.EMAIL_INBOX_PASS) {
    configs.push({ user: process.env.EMAIL_INBOX_USER, pass: process.env.EMAIL_INBOX_PASS });
  }
  if (process.env.EMAIL_INBOX_USER_2 && process.env.EMAIL_INBOX_PASS_2) {
    configs.push({ user: process.env.EMAIL_INBOX_USER_2, pass: process.env.EMAIL_INBOX_PASS_2 });
  }
  return configs;
}

const IMAP_BASE = { host: 'imap.gmail.com', port: 993, secure: true, logger: false };

// ─── SystemConfig keys ────────────────────────────────────────────────────────

const LAST_POLL_KEY = 'email_inbox_last_poll';
const PROCESSED_IDS_KEY = 'email_inbox_processed_ids';

// ─── Source detection ─────────────────────────────────────────────────────────

type DetectedSource = {
  source: 'MEDIT' | 'SHINING3D' | 'EMAIL';
  impressionType: 'DIGITAL_SCAN' | 'PHYSICAL_IMPRINT';
  scanSource: 'MEDIT' | 'SHINING3D' | null;
  isDesignPreview: boolean;
};

function detectSource(fromAddress: string, subject: string): DetectedSource {
  const subjectLower = subject.toLowerCase();
  const fromLower = fromAddress.toLowerCase();

  // Shining 3D — sender is service@mq.shining3d.com
  if (
    fromLower.includes('shining3d.com') ||
    fromLower.includes('shining-3d') ||
    subjectLower.includes('shining')
  ) {
    return {
      source: 'SHINING3D',
      impressionType: 'DIGITAL_SCAN',
      scanSource: 'SHINING3D',
      isDesignPreview: false,
    };
  }

  // MeditLink — subject starts with [Medit Link] or sender from medit
  if (
    subject.includes('[Medit Link]') ||
    fromLower.includes('meditlink') ||
    fromLower.includes('medit.com')
  ) {
    const isDesignPreview =
      subjectLower.includes('pregled modelacije') ||
      subjectLower.includes('design preview') ||
      subjectLower.includes('modelation');
    return {
      source: 'MEDIT',
      impressionType: 'DIGITAL_SCAN',
      scanSource: 'MEDIT',
      isDesignPreview,
    };
  }

  // Everything else
  return {
    source: 'EMAIL',
    impressionType: 'PHYSICAL_IMPRINT',
    scanSource: null,
    isDesignPreview: false,
  };
}

// ─── Subject parsers ──────────────────────────────────────────────────────────

/**
 * MeditLink subject: [Medit Link] "Patient Name's Case 17-16,15" Order Request Received
 * Extracts patient name and case reference.
 */
function parseMeditSubject(subject: string): { patientName: string | null; scanReference: string | null } {
  const nameMatch = subject.match(/"([^"]+?)'s Case/i);
  const caseMatch = subject.match(/Case\s+([\d,\-]+)/i);
  return {
    patientName: nameMatch ? nameMatch[1].trim() : null,
    scanReference: caseMatch ? `Case ${caseMatch[1].trim()}` : null,
  };
}

/**
 * Shining 3D subject: "New Order arrived from doctor Rommy of HISA LEPEGA NASMEHA PG"
 * Extracts doctor name and clinic name for dentist matching.
 */
function parseShining3DSubject(subject: string): { doctorName: string | null; clinicName: string | null } {
  const match = subject.match(/from\s+doctor\s+(.+?)\s+of\s+(.+?)(?:\s*$)/i);
  if (match) {
    return {
      doctorName: match[1].trim(),
      clinicName: match[2].trim(),
    };
  }
  return { doctorName: null, clinicName: null };
}

// ─── Dentist matching ─────────────────────────────────────────────────────────

/**
 * Tries to match a dentist from parsed email data.
 * For Shining 3D, uses doctor name + clinic extracted from subject.
 * Falls back to sender email, then sender name.
 */
async function findDentistId(
  parsed: ParsedMail,
  hints?: { doctorName?: string | null; clinicName?: string | null }
): Promise<string | null> {
  // 1. Try clinic name from subject (most reliable for Shining3D)
  if (hints?.clinicName) {
    const byClinic = await prisma.dentist.findFirst({
      where: {
        clinicName: { contains: hints.clinicName, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byClinic) return byClinic.id;
  }

  // 2. Try doctor name from subject
  if (hints?.doctorName) {
    const byDoctor = await prisma.dentist.findFirst({
      where: {
        dentistName: { contains: hints.doctorName, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byDoctor) return byDoctor.id;
  }

  // 3. Try sender email address
  const fromAddress = parsed.from?.value?.[0]?.address ?? '';
  if (fromAddress) {
    const byEmail = await prisma.dentist.findFirst({
      where: { email: { equals: fromAddress, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  // 4. Try sender display name
  const fromName = parsed.from?.value?.[0]?.name ?? '';
  if (fromName) {
    const byName = await prisma.dentist.findFirst({
      where: {
        OR: [
          { dentistName: { contains: fromName.split(' ')[0], mode: 'insensitive' } },
          { clinicName: { contains: fromName, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byName) return byName.id;
  }

  return null;
}

// ─── Duplicate guard ──────────────────────────────────────────────────────────

async function getProcessedIds(): Promise<Set<string>> {
  const config = await prisma.systemConfig.findUnique({ where: { key: PROCESSED_IDS_KEY } });
  if (!config) return new Set();
  try {
    return new Set(JSON.parse(config.value) as string[]);
  } catch {
    return new Set();
  }
}

async function addProcessedId(messageId: string): Promise<void> {
  const existing = await getProcessedIds();
  existing.add(messageId);
  const arr = Array.from(existing).slice(-500); // keep last 500
  await prisma.systemConfig.upsert({
    where: { key: PROCESSED_IDS_KEY },
    create: { key: PROCESSED_IDS_KEY, value: JSON.stringify(arr), description: 'Processed email message IDs' },
    update: { value: JSON.stringify(arr) },
  });
}

// ─── Order creation ───────────────────────────────────────────────────────────

async function createIncomingOrder(params: {
  dentistId: string;
  patientName: string | null;
  scanSource: 'MEDIT' | 'SHINING3D' | null;
  scanReference: string | null;
  impressionType: 'DIGITAL_SCAN' | 'PHYSICAL_IMPRINT';
  notes: string | null;
  systemUserId: string;
}): Promise<{ orderNumber: string; worksheetNumber: string }> {
  return prisma.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear();
    const configKey = `next_order_number_${currentYear}`;
    let config = await tx.systemConfig.findUnique({ where: { key: configKey } });
    if (!config) {
      config = await tx.systemConfig.create({
        data: { key: configKey, value: '1', description: `Next order number for ${currentYear}` },
      });
    }
    const currentNumber = parseInt(config.value, 10);
    await tx.systemConfig.update({ where: { key: configKey }, data: { value: (currentNumber + 1).toString() } });
    const orderNumber = `${currentYear.toString().slice(-2)}${currentNumber.toString().padStart(3, '0')}`;
    const worksheetNumber = `DN-${orderNumber}`;

    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        dentistId: params.dentistId,
        createdById: params.systemUserId,
        patientName: params.patientName,
        impressionType: params.impressionType,
        notes: params.notes,
        status: 'IN_PRODUCTION',
      },
    });

    await tx.workSheet.create({
      data: {
        worksheetNumber,
        revision: 1,
        orderId: newOrder.id,
        dentistId: params.dentistId,
        createdById: params.systemUserId,
        patientName: params.patientName,
        status: 'DRAFT',
        scanSource: params.scanSource,
        scanReference: params.scanReference,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.systemUserId,
        action: 'CREATE',
        entityType: 'Order',
        entityId: newOrder.id,
        newValues: JSON.stringify({ orderNumber, source: 'EMAIL_AUTO', scanReference: params.scanReference }),
      },
    });

    return { orderNumber, worksheetNumber };
  });
}

// ─── Poll a single inbox ──────────────────────────────────────────────────────

async function pollSingleInbox(
  inboxConfig: InboxConfig,
  systemUserId: string,
  processedIds: Set<string>,
  result: PollResult
): Promise<void> {
  const client = new ImapFlow({
    ...IMAP_BASE,
    auth: { user: inboxConfig.user, pass: inboxConfig.pass },
  } as any);

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      for await (const message of client.fetch({ seen: false, since }, { envelope: true, source: true })) {
        const messageId = message.envelope?.messageId ?? `${inboxConfig.user}-${message.uid}`;

        if (processedIds.has(messageId)) {
          result.skipped++;
          continue;
        }

        try {
          if (!message.source) { result.skipped++; continue; }
          const parsed: ParsedMail = await simpleParser(Readable.from(message.source as Buffer));

          const subject = parsed.subject ?? '';
          const fromAddress = parsed.from?.value?.[0]?.address ?? '';
          const detected = detectSource(fromAddress, subject);

          // Skip design previews
          if (detected.isDesignPreview) {
            await addProcessedId(messageId);
            result.skipped++;
            continue;
          }

          // Parse source-specific fields
          let patientName: string | null = null;
          let scanReference: string | null = null;
          let hints: { doctorName?: string | null; clinicName?: string | null } = {};

          if (detected.source === 'MEDIT') {
            const medit = parseMeditSubject(subject);
            patientName = medit.patientName;
            scanReference = medit.scanReference;
          } else if (detected.source === 'SHINING3D') {
            const s3d = parseShining3DSubject(subject);
            hints = { doctorName: s3d.doctorName, clinicName: s3d.clinicName };
            // Use clinic as patient placeholder until staff fills it in
            scanReference = subject; // keep full subject as reference
          }

          // Find dentist
          let dentistId = await findDentistId(parsed, hints);
          if (!dentistId) {
            // Fallback: first active dentist (staff can reassign in inbox)
            const fallback = await prisma.dentist.findFirst({
              where: { deletedAt: null, active: true },
              select: { id: true },
              orderBy: { createdAt: 'asc' },
            });
            dentistId = fallback?.id ?? null;
          }

          if (!dentistId) {
            result.errors.push(`No dentist found for: ${subject}`);
            result.skipped++;
            continue;
          }

          const notes = `Auto-uvoženo iz e-pošte (${inboxConfig.user})\nZadeva: ${subject}`;

          const { orderNumber, worksheetNumber } = await createIncomingOrder({
            dentistId,
            patientName,
            scanSource: detected.scanSource,
            scanReference,
            impressionType: detected.impressionType,
            notes,
            systemUserId,
          });

          processedIds.add(messageId);
          await addProcessedId(messageId);
          await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);

          result.processed++;
          result.newOrders.push({ orderNumber, worksheetNumber, subject });
        } catch (msgError: any) {
          result.errors.push(`[${inboxConfig.user}] Failed on "${message.envelope?.subject ?? '?'}": ${msgError.message}`);
        }
      }
    } finally {
      lock.release();
    }
  } catch (connError: any) {
    result.errors.push(`[${inboxConfig.user}] IMAP connection failed: ${connError.message}`);
  } finally {
    await client.logout().catch(() => {});
  }
}

// ─── Main poll function ───────────────────────────────────────────────────────

export interface PollResult {
  processed: number;
  skipped: number;
  errors: string[];
  newOrders: Array<{ orderNumber: string; worksheetNumber: string; subject: string }>;
}

export async function pollEmailInbox(): Promise<PollResult> {
  const result: PollResult = { processed: 0, skipped: 0, errors: [], newOrders: [] };

  const inboxes = getInboxConfigs();
  if (inboxes.length === 0) {
    result.errors.push('No email inboxes configured (EMAIL_INBOX_USER / EMAIL_INBOX_USER_2)');
    return result;
  }

  const systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
    select: { id: true },
  });
  if (!systemUser) {
    result.errors.push('No admin user found for audit log attribution');
    return result;
  }

  // Shared processed IDs across all inboxes
  const processedIds = await getProcessedIds();

  // Poll all inboxes sequentially (avoids DB contention)
  for (const inbox of inboxes) {
    await pollSingleInbox(inbox, systemUser.id, processedIds, result);
  }

  // Update last poll timestamp
  await prisma.systemConfig.upsert({
    where: { key: LAST_POLL_KEY },
    create: { key: LAST_POLL_KEY, value: new Date().toISOString(), description: 'Last email inbox poll timestamp' },
    update: { value: new Date().toISOString() },
  }).catch(() => {});

  return result;
}

export async function getLastPollTime(): Promise<Date | null> {
  const config = await prisma.systemConfig.findUnique({ where: { key: LAST_POLL_KEY } });
  return config ? new Date(config.value) : null;
}
