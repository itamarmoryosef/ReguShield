import { handleJobWebhook } from "@/lib/jobs/handler";
import { retryReminderJob } from "@/lib/jobs/reminders";
import { reminderRetryPayloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleJobWebhook(request, reminderRetryPayloadSchema, "reminders.retry", async ({ payload }) => {
    return retryReminderJob(payload.job_id, payload.reason);
  });
}
