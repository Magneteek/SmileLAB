/**
 * Next.js Instrumentation
 * Runs once when the server starts. Sets up background jobs.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production or when configured
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.EMAIL_INBOX_USER && !process.env.EMAIL_INBOX_USER_2) return;

  const intervalMinutes = parseInt(process.env.EMAIL_INBOX_POLL_INTERVAL ?? '5', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  const { pollEmailInbox } = await import('@/lib/services/email-inbox-service');

  const runPoll = async () => {
    try {
      const result = await pollEmailInbox();
      if (result.processed > 0) {
        console.log(`[email-inbox] Processed ${result.processed} new email(s):`,
          result.newOrders.map((o) => o.worksheetNumber).join(', '));
      }
      if (result.errors.length > 0) {
        console.warn('[email-inbox] Errors:', result.errors);
      }
    } catch (err) {
      console.error('[email-inbox] Poll failed:', err);
    }
  };

  // Initial poll after 30s (let the server fully start first)
  setTimeout(runPoll, 30_000);

  // Then poll on interval
  setInterval(runPoll, intervalMs);

  const inboxes = [process.env.EMAIL_INBOX_USER, process.env.EMAIL_INBOX_USER_2].filter(Boolean);
  console.log(`[email-inbox] Poller started — ${inboxes.join(', ')} — every ${intervalMinutes} min`);
}
