import { Receiver } from "@upstash/qstash";
import { AppError } from "@/lib/errors";
import { isDemoMode, isJobsAuthConfigured } from "@/lib/env";
import type { JobProvider } from "./types";

export async function verifyJobRequest(
  request: Request,
  rawBody: string,
): Promise<JobProvider> {
  if (!isJobsAuthConfigured()) {
    if (isDemoMode() && process.env.JOBS_ALLOW_INSECURE_DEV === "true") {
      return "manual";
    }
    throw new AppError("עבודות הרקע אינן מוגדרות", { code: "JOBS_UNCONFIGURED", status: 503 });
  }

  const qstashSignature = request.headers.get("upstash-signature");
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (qstashSignature && currentKey && nextKey) {
    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });
    const valid = await receiver.verify({
      signature: qstashSignature,
      body: rawBody,
    });
    if (!valid) {
      throw new AppError("חתימת QStash אינה תקינה", { code: "INVALID_QSTASH_SIGNATURE", status: 401 });
    }
    return "qstash";
  }

  const secret = process.env.JOBS_WEBHOOK_SECRET;
  const authorization = request.headers.get("authorization");
  const triggerHeader = request.headers.get("x-trigger-secret") ?? request.headers.get("x-jobs-secret");

  if (secret && authorization === `Bearer ${secret}`) {
    return request.headers.get("x-trigger-secret") ? "trigger" : "manual";
  }

  if (secret && triggerHeader === secret) {
    return "trigger";
  }

  throw new AppError("הבקשה אינה מאומתת", { code: "UNAUTHORIZED_JOB", status: 401 });
}

export function jobEventId(request: Request, payloadEventId: string): string {
  return (
    request.headers.get("upstash-message-id") ||
    request.headers.get("x-trigger-run-id") ||
    payloadEventId
  );
}
