import { AppError } from "@/lib/errors";
import {
  categoryLabel,
  loadReminderRecipient,
  sendReminderEmail,
  UndeliverableError,
  type ReminderDocument,
} from "@/lib/jobs/delivery";
import { createServiceClient } from "@/lib/supabase/admin";
import { dueDocumentSchema, reminderJobRowSchema, uuidSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type DueDocument = z.infer<typeof dueDocumentSchema>;

/**
 * How long to stay quiet about a document we already wrote about.
 *
 * The cron runs daily while a document stays expired for weeks. Deduping only
 * against unsent jobs is not enough: once a reminder is delivered the job is
 * marked sent, so the next morning the same document looks fresh again and the
 * customer gets the same email every single day until they act. The interval
 * shortens as the deadline approaches, so a permit lapsing next week is nudged
 * weekly while one lapsing in two months is mentioned monthly.
 */
export function cooldownDays(document: DueDocument): number {
  if (document.status === "expired" || !document.expiry_date) return 7;

  const days = Math.ceil((new Date(document.expiry_date).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days) || days <= 7) return 7;
  if (days <= 30) return 14;
  return 30;
}

/** Documents we must not write about yet: one is in flight, or was just sent. */
async function silencedDocumentIds(
  admin: ReturnType<typeof createServiceClient>,
  documents: DueDocument[],
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("reminder_jobs")
    .select("document_id, status, updated_at")
    .in("status", ["pending", "processing", "sent", "cancelled"])
    .in(
      "document_id",
      documents.map((document) => document.id),
    );

  if (error) {
    throw new AppError("בדיקת תזכורות קיימות נכשלה", { code: "ENQUEUE_DEDUPE_FAILED", status: 500 });
  }

  // Only the newest job per document decides, so an old delivery cannot keep a
  // document silent forever.
  const latest = new Map<string, { status: string; at: number }>();
  for (const row of data ?? []) {
    const id = row.document_id;
    if (typeof id !== "string") continue;
    const at = new Date(row.updated_at as string).getTime();
    const seen = latest.get(id);
    if (!seen || at > seen.at) latest.set(id, { status: row.status as string, at });
  }

  const silenced = new Set<string>();

  for (const document of documents) {
    const last = latest.get(document.id);
    if (!last) continue;

    if (last.status === "pending" || last.status === "processing") {
      silenced.add(document.id);
      continue;
    }

    const elapsedDays = (Date.now() - last.at) / 86_400_000;
    if (elapsedDays < cooldownDays(document)) {
      silenced.add(document.id);
    }
  }

  return silenced;
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

  const silenced = await silencedDocumentIds(admin, due);
  const fresh = due.filter((doc) => !silenced.has(doc.id));
  if (fresh.length === 0) {
    return { created: 0, job_ids: [] };
  }

  const rows = fresh.map((doc) => ({
    business_id: doc.business_id,
    template_id: doc.template_id,
    document_id: doc.id,
    channel: "email" as const,
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

/**
 * Sends every outstanding reminder for the business this job belongs to.
 *
 * The queue holds one row per document, but a business with five expiring
 * permits does not want five emails. The whole outstanding batch is claimed in
 * a single statement and answered with one message: that also makes the claim
 * the concurrency guard, since a parallel worker that arrives second claims
 * nothing and exits instead of sending a duplicate.
 */
export async function processReminderJob(jobId: string): Promise<{ status: string; sent?: number }> {
  const admin = createServiceClient();
  const { data: job, error } = await admin
    .from("reminder_jobs")
    .select("id, business_id, status, attempt_count, max_attempts, payload")
    .eq("id", jobId)
    .maybeSingle();

  const parsedJob = reminderJobRowSchema.safeParse(job);
  if (error || !parsedJob.success || !job?.business_id) {
    throw new AppError("משימת התזכורת לא נמצאה", { code: "JOB_NOT_FOUND", status: 404 });
  }

  if (parsedJob.data.status === "sent" || parsedJob.data.status === "cancelled") {
    return { status: parsedJob.data.status };
  }

  const businessId = job.business_id as string;

  const { data: claimedRows, error: claimError } = await admin
    .from("reminder_jobs")
    .update({ status: "processing" })
    .eq("business_id", businessId)
    .in("status", ["pending", "failed"])
    .select("id, template_id, document_id, attempt_count, max_attempts, payload");

  if (claimError) {
    throw new AppError("תפיסת המשימה נכשלה", { code: "JOB_CLAIM_FAILED", status: 500 });
  }

  const claimed = claimedRows ?? [];
  if (claimed.length === 0) {
    // Another worker got there first and is sending, or already sent.
    return { status: "skipped" };
  }

  const ids = claimed.map((row) => row.id as string);

  // Attempts are counted per row so a repeatedly failing business eventually
  // stops instead of being retried forever.
  const exhausted = claimed.filter(
    (row) => Number(row.attempt_count ?? 0) + 1 >= Number(row.max_attempts ?? 5),
  );

  try {
    const [recipient, documents] = await Promise.all([
      loadReminderRecipient(admin, businessId),
      loadReminderDocuments(admin, claimed),
    ]);

    if (documents.length === 0) {
      await closeJobs(admin, ids, "cancelled", "אין מסמכים לתזכורת");
      return { status: "cancelled" };
    }

    const delivery = await sendReminderEmail(recipient, documents);

    await admin
      .from("reminder_jobs")
      .update({
        status: "sent",
        channel: "email",
        last_error: null,
        attempt_count: 1,
        payload: {
          delivery: "email",
          to: delivery.to,
          provider_message_id: delivery.providerId,
          documents: documents.length,
          sent_at: new Date().toISOString(),
        },
      })
      .in("id", ids);

    return { status: "sent", sent: documents.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "שליחה נכשלה";

    // Nothing about a missing address improves by trying again tomorrow.
    const terminal = error instanceof UndeliverableError || exhausted.length === claimed.length;
    await closeJobs(admin, ids, terminal ? "cancelled" : "failed", message);

    if (terminal) {
      return { status: "cancelled" };
    }
    throw new AppError(message, { code: "DELIVERY_FAILED", status: 500 });
  }
}

async function closeJobs(
  admin: ReturnType<typeof createServiceClient>,
  ids: string[],
  status: "failed" | "cancelled",
  message: string,
): Promise<void> {
  await admin.from("reminder_jobs").update({ status, last_error: message }).in("id", ids);
}

/** Turns claimed queue rows into the lines the customer will read. */
async function loadReminderDocuments(
  admin: ReturnType<typeof createServiceClient>,
  claimed: Array<Record<string, unknown>>,
): Promise<ReminderDocument[]> {
  const documentIds = claimed
    .map((row) => row.document_id)
    .filter((id): id is string => typeof id === "string");

  if (documentIds.length === 0) return [];

  const { data } = await admin
    .from("client_documents")
    .select("id, expiry_date, status, document_templates (name, category)")
    .in("id", documentIds);

  return (data ?? [])
    .map((row) => {
      const template = row.document_templates as { name?: string; category?: string } | null;
      return {
        templateName: template?.name ?? "מסמך",
        category: categoryLabel(template?.category),
        expiryDate: (row.expiry_date as string | null) ?? null,
        status: (row.status as string) ?? "expiring_soon",
      };
    })
    .sort((a, b) => (a.status === "expired" && b.status !== "expired" ? -1 : 0));
}

/**
 * Sends whatever is waiting, newest deadlines first, until the time budget runs out.
 *
 * This is what makes the daily cron self-sufficient: QStash is an accelerator
 * when it is configured, not a requirement for anything to be delivered.
 */
export async function drainPendingReminders(
  budgetMs: number,
): Promise<{ businesses: number; sent: number; failed: number }> {
  const admin = createServiceClient();
  const startedAt = Date.now();
  const handled = new Set<string>();
  let sent = 0;
  let failed = 0;

  while (Date.now() - startedAt < budgetMs) {
    const { data, error } = await admin
      .from("reminder_jobs")
      .select("id, business_id")
      .in("status", ["pending", "failed"])
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(200);

    if (error) break;

    const next = (data ?? []).find(
      (row) => typeof row.business_id === "string" && !handled.has(row.business_id),
    );
    if (!next) break;

    handled.add(next.business_id as string);

    try {
      const result = await processReminderJob(next.id as string);
      if (result.status === "sent") sent += 1;
    } catch {
      // The job row already carries the reason; one bad tenant must not stop the run.
      failed += 1;
    }
  }

  return { businesses: handled.size, sent, failed };
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

