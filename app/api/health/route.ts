import { NextResponse } from "next/server";
import { isDemoMode, isOpenAiConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Uptime probe. Reports which backends are wired so a deployment that quietly
 * fell back to demo data is visible from the outside.
 */
export async function GET() {
  const demo = isDemoMode();
  const checks: Record<string, string> = {
    mode: demo ? "demo" : "live",
    openai: isOpenAiConfigured() ? "configured" : "missing",
  };

  if (!demo) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("document_templates").select("id").limit(1);
      checks.supabase = error ? `error: ${error.message}` : "ok";
    } catch (error) {
      checks.supabase = `error: ${error instanceof Error ? error.message : "unknown"}`;
    }
  }

  const healthy = checks.supabase === undefined || checks.supabase === "ok";

  return NextResponse.json(
    { ok: healthy, checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
