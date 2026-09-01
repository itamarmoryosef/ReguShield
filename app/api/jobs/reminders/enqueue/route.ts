import { handleJobWebhook } from "@/lib/jobs/handler";
import { publishReminderProcessJobs } from "@/lib/jobs/publish";
import { enqueueDueReminders } from "@/lib/jobs/reminders";
import { reminderEnqueuePayloadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  return handleJobWebhook(request, reminderEnqueuePayloadSchema, "reminders.enqueue", async ({ payload }) => {
    const result = await enqueueDueReminders(payload.look_ahead_days ?? 60);
    const published = await publishReminderProcessJobs(result.job_ids);
    return { ...result, published };
  });
}
