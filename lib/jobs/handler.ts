import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseJsonObject, parseOrThrow } from "@/lib/validation/parse";
import { jobEventId, verifyJobRequest } from "./verify";
import type { JobProvider } from "./types";

type JobContext<T> = {
  payload: T;
  eventId: string;
  provider: JobProvider;
};

export async function handleJobWebhook<T>(
  request: Request,
  schema: ZodType<T>,
  eventType: string,
  handler: (ctx: JobContext<T>) => Promise<Record<string, unknown>>,
): Promise<NextResponse> {
  const rawBody = await request.text();

  try {
    const provider = await verifyJobRequest(request, rawBody);
    const json = rawBody ? parseJsonObject(rawBody) : {};
    const payload = parseOrThrow(schema, json);
    const eventId = jobEventId(request, readEventId(payload) ?? crypto.randomUUID());

    if (isDemoMode()) {
      return NextResponse.json({
        ok: true,
        demo: true,
        event_id: eventId,
        event_type: eventType,
      });
    }

    const admin = createServiceClient();
    const { error: receiptError } = await admin.from("job_webhook_receipts").insert({
      provider,
      event_id: eventId,
      event_type: eventType,
      payload: json,
    });

    if (receiptError) {
      if (receiptError.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true, event_id: eventId });
      }
      throw new AppError("רישום אירוע העבודה נכשל", { code: "RECEIPT_FAILED", status: 500 });
    }

    const result = await handler({ payload, eventId, provider });
    return NextResponse.json({ ok: true, event_id: eventId, ...result });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(
      { ok: false, error: toUserMessage(error) },
      { status },
    );
  }
}

function readEventId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("event_id" in payload)) {
    return null;
  }
  const value = payload.event_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}
