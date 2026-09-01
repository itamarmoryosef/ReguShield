import { AppError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase/admin";
import { dueDocumentSchema, reminderJobRowSchema, uuidSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type DueDocument = z.infer<typeof dueDocumentSchema>;

/** Documents that already have a reminder waiting or in flight. */
async function openJobDocumentIds(
  admin: ReturnType<typeof createServiceClient>,
  documentIds: string[],
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("reminder_jobs")
    .select("document_id")
    .in("status", ["pending", "processing"])
    .in("document_id", documentIds);

  if (error) {
    throw new AppError("בדיקת תזכורות קיימות נכשלה", { code: "ENQUEUE_DEDUPE_FAILED", status: 500 });
  }

  return new Set((data ?? []).map((row) => row.document_id).filter((id): id is string => Boolean(id)));
}

const PAGE_SIZE = 500;
/** Bounds a single run so a runaway query cannot exhaust the function timeout. */
const MAX_PAGES = 20;

export async function enqueueDueReminders(lookAheadDays: number): Promise<{ created: number; job_ids: string[] }> {
  const admin = createServiceClient();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + lookAheadDays);
  const horizonIso = horizon.toISOString().slice(0, 10);

  // Paged rather than capped: a fixed limit would silently drop the reminders of
  // every tenant beyond it once the portfolio grows.
  const due: DueDocument[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await admin
      .from("client_documents")
      .select("id, business_id, template_id, expiry_date, status")
      .in("status", ["expired", "expiring_soon"])
      .lte("expiry_date", horizonIso)
      .order("expiry_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new AppError("שליפת מסמכים לחידוש נכשלה", { code: "ENQUEUE_QUERY_FAILED", status: 500 });
    }

    const parsed = dueDocumentSchema.array().safeParse(data ?? []);
    if (parsed.success) due.push(...parsed.data);
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  if (due.length === 0) {
    return { created: 0, job_ids: [] };
  }

  const pending = await openJobDocumentIds(
    admin,
    due.map((doc) => doc.id),
  );
  // The cron runs daily while a document stays expired for weeks, so without this
  // the same reminder would pile up once per day.
  const fresh = due.filter((doc) => !pending.has(doc.id));
  if (fresh.length === 0) {
    return { created: 0, job_ids: [] };
  }

  const rows = fresh.map((doc) => ({
    business_id: doc.business_id,
    template_id: doc.template_id,
    document_id: doc.id,
    channel: "whatsapp" as const,
    status: "pending" as const,
    scheduled_for: new Date().toISOString(),
    payload: {
      expiry_date: doc.expiry_date,
      document_status: doc.status,
    },
  }));

  const { data: inserted, error: insertError } = await admin
    .from("reminder_jobs")
    .insert(rows)
    .select("id");

  if (insertError) {
    throw new AppError("יצירת משימות תזכורת נכשלה", { code: "ENQUEUE_INSERT_FAILED", status: 500 });
  }

  const jobIds = (inserted ?? [])
    .map((row) => uuidSchema.safeParse(row.id))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);

  return { created: jobIds.length, job_ids: jobIds };
}

export async function processReminderJob(jobId: string): Promise<{ status: string }> {
  const admin = createServiceClient();
  const { data: job, error } = await admin
    .from("reminder_jobs")
    .select("id, status, attempt_count, max_attempts, payload")
    .eq("id", jobId)
    .maybeSingle();

  const parsedJob = reminderJobRowSchema.safeParse(job);
  if (error || !parsedJob.success) {
    throw new AppError("משימת התזכורת לא נמצאה", { code: "JOB_NOT_FOUND", status: 404 });
  }

  if (parsedJob.data.status === "sent" || parsedJob.data.status === "cancelled") {
    return { status: parsedJob.data.status };
  }

  const { error: claimError } = await admin
    .from("reminder_jobs")
    .update({
      status: "processing",
      attempt_count: parsedJob.data.attempt_count + 1,
    })
    .eq("id", jobId)
    .in("status", ["pending", "failed"]);

  if (claimError) {
    throw new AppError("תפיסת המשימה נכשלה", { code: "JOB_CLAIM_FAILED", status: 500 });
  }

  try {
    await deliverWhatsAppReminder(jobId);
    await admin
      .from("reminder_jobs")
      .update({
        status: "sent",
        last_error: null,
        payload: { ...parsedJob.data.payload, delivery: "stubbed" },
      })
      .eq("id", jobId);
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "שליחה נכשלה";
    await admin
      .from("reminder_jobs")
      .update({ status: "failed", last_error: message })
      .eq("id", jobId);
    throw new AppError(message, { code: "DELIVERY_FAILED", status: 500 });
  }
}

export async function retryReminderJob(jobId: string, reason?: string): Promise<{ status: string }> {
  const admin = createServiceClient();
  const { data: job, error } = await admin
    .from("reminder_jobs")
    .select("id, status, attempt_count, max_attempts")
    .eq("id", jobId)
    .maybeSingle();

  const parsedJob = reminderJobRowSchema.safeParse(job);
  if (error || !parsedJob.success) {
    throw new AppError("משימת התזכורת לא נמצאה", { code: "JOB_NOT_FOUND", status: 404 });
  }

  if (parsedJob.data.attempt_count >= parsedJob.data.max_attempts) {
    throw new AppError("המשימה מיצתה את מספר הניסיונות", { code: "MAX_ATTEMPTS", status: 409 });
  }

  const { error: updateError } = await admin
    .from("reminder_jobs")
    .update({
      status: "pending",
      last_error: reason ?? null,
      scheduled_for: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) {
    throw new AppError("איפוס המשימה לניסיון חוזר נכשל", { code: "RETRY_FAILED", status: 500 });
  }

  return processReminderJob(jobId);
}

async function deliverWhatsAppReminder(jobId: string): Promise<void> {
  // Intentionally short: WhatsApp Cloud API / Twilio is wired by the external worker later.
  // Returning quickly keeps this route compatible with QStash/Trigger.dev retries.
  if (!jobId) {
    throw new AppError("מזהה משימה חסר", { code: "MISSING_JOB" });
  }
}
