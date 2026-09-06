import { handleJobWebhook } from "@/lib/jobs/handler";
import { isQStashConfigured, publishReminderProcessJobs } from "@/lib/jobs/publish";
import { drainPendingReminders, enqueueDueReminders } from "@/lib/jobs/reminders";
import { reminderEnqueuePayloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
// Scans every expiring document across all tenants and, without a fan-out
// queue, also delivers them, so it needs more room than a single-record worker.
export const maxDuration = 300;

/** Leaves the request enough room to write its response before Vercel cuts it. */
const DRAIN_BUDGET_MS = 240_000;

export async function POST(request: Request) {
  return handleJobWebhook(request, reminderEnqueuePayloadSchema, "reminders.enqueue", async ({ payload }) => {
    const result = await enqueueDueReminders(payload.look_ahead_days ?? 60);

    // With QStash the run hands the work off and returns immediately. Without
    // it, this route sends the mail itself — earlier the jobs were written and
    // then waited for a worker that was never deployed, so nothing was ever
    // delivered.
    if (isQStashConfigured()) {
      const published = await publishReminderProcessJobs(result.job_ids);
      return { ...result, published, drained: null };
    }

    const drained = await drainPendingReminders(DRAIN_BUDGET_MS);
    return { ...result, published: 0, drained };
  });
}

/**
 * Vercel Cron calls its target with GET and an `Authorization: Bearer` header,
 * which the shared verifier already accepts when CRON_SECRET matches
 * JOBS_WEBHOOK_SECRET. The body is empty, so the payload falls back to defaults.
 */
export const GET = POST;
