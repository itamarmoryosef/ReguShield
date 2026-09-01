import { Client } from "@upstash/qstash";

const MAX_FANOUT = 25;

export async function publishReminderProcessJobs(jobIds: string[]): Promise<number> {
  const token = process.env.QSTASH_TOKEN;
  const target = process.env.JOBS_PROCESS_URL;
  if (!token || !target || jobIds.length === 0) {
    return 0;
  }

  const client = new Client({ token });
  const batch = jobIds.slice(0, MAX_FANOUT);

  await Promise.all(
    batch.map((jobId) =>
      client.publishJSON({
        url: target,
        body: { event_id: `process-${jobId}`, job_id: jobId },
      }),
    ),
  );

  return batch.length;
}
