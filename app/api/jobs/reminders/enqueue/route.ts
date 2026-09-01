import { handleJobWebhook } from "@/lib/jobs/handler";
import { publishReminderProcessJobs } from "@/lib/jobs/publish";
import { enqueueDueReminders } from "@/lib/jobs/reminders";
import { reminderEnqueuePayloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
// Scans every expiring document across all tenants and publishes one message per
// reminder, so it needs more room than a single-record worker.
export const maxDuration = 300;

export async function POST(request: Request) {
  return handleJobWebhook(request, reminderEnqueuePayloadSchema, "reminders.enqueue", async ({ payload }) => {
    const result = await enqueueDueReminders(payload.look_ahead_days ?? 60);
    const published = await publishReminderProcessJobs(result.job_ids);
    return { ...result, published };
  });
}

/**
 * Vercel Cron calls its target with GET and an `Authorization: Bearer` header,
 * which the shared verifier already accepts when CRON_SECRET matches
 * JOBS_WEBHOOK_SECRET. The body is empty, so the payload falls back to defaults.
 */
export const GET = POST;
