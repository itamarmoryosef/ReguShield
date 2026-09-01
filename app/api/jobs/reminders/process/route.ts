import { handleJobWebhook } from "@/lib/jobs/handler";
import { processReminderJob } from "@/lib/jobs/reminders";
import { reminderProcessPayloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  return handleJobWebhook(request, reminderProcessPayloadSchema, "reminders.process", async ({ payload }) => {
    return processReminderJob(payload.job_id);
  });
}
