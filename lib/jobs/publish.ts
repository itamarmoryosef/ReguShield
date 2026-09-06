import { Client } from "@upstash/qstash";

/**
 * Messages published per round trip. This bounds concurrency against QStash,
 * it does not bound how many jobs get published — everything handed in is
 * published, in batches.
 */
const BATCH_SIZE = 25;

export async function publishReminderProcessJobs(jobIds: string[]): Promise<number> {
  const token = process.env.QSTASH_TOKEN;
  const target = process.env.JOBS_PROCESS_URL;
  if (!token || !target || jobIds.length === 0) {
    return 0;
  }

  const client = new Client({ token });
  let published = 0;

  for (let start = 0; start < jobIds.length; start += BATCH_SIZE) {
    const batch = jobIds.slice(start, start + BATCH_SIZE);
    const outcomes = await Promise.allSettled(
      batch.map((jobId) =>
        client.publishJSON({
          url: target,
          body: { event_id: `process-${jobId}`, job_id: jobId },
        }),
      ),
    );
    // A rejected publish leaves its job pending, which the next drain picks up.
    published += outcomes.filter((outcome) => outcome.status === "fulfilled").length;
  }

  return published;
}

/** True when the fan-out path is actually usable, so callers can fall back. */
export function isQStashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && process.env.JOBS_PROCESS_URL);
}
