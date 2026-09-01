import { AppError } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase/admin";
import { dueDocumentSchema, reminderJobRowSchema, uuidSchema } from "@/lib/validation/schemas";

export async function enqueueDueReminders(lookAheadDays: number): Promise<{ created: number; job_ids: string[] }> {
  const admin = createServiceClient();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + lookAheadDays);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("client_documents")
    .select("id, business_id, template_id, expiry_date, status")
    .in("status", ["expired", "expiring_soon"])
    .lte("expiry_date", horizonIso)
    .limit(200);

  if (error) {
    throw new AppError("שליפת מסמכים לחידוש נכשלה", { code: "ENQUEUE_QUERY_FAILED", status: 500 });
  }

  const dueParsed = dueDocumentSchema.array().safeParse(data ?? []);
  const due = dueParsed.success ? dueParsed.data : [];
  if (due.length === 0) {
    return { created: 0, job_ids: [] };
  }

  const rows = due.map((doc) => ({
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
