export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isJobsAuthConfigured(): boolean {
  return Boolean(
    process.env.JOBS_WEBHOOK_SECRET ||
      (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY),
  );
}

export const SIGNED_URL_TTL_SECONDS = 300;
export const DOCUMENT_BUCKET = "client-documents";
