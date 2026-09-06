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

/**
 * Absolute origin for links that leave the app, such as the address Supabase
 * sends people back to from a verification email.
 */
/** Reminders can only go out once a transactional sender is configured. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sender for reminder mail. Must stay on a domain verified at Resend —
 * an unverified domain is refused for every recipient except the account
 * owner, which looks fine in a self-test and fails for every real customer.
 */
export function reminderFromAddress(): string {
  return process.env.REMINDER_FROM_ADDRESS || "ReguShield <noreply@crmit.co.il>";
}

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SIGNED_URL_TTL_SECONDS = 300;
export const DOCUMENT_BUCKET = "client-documents";
