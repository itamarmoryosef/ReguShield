import { NextResponse } from "next/server";
import { postAuthDestination } from "@/lib/auth/post-auth";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginError(request: Request, message: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

/**
 * Landing point for the verification link in Supabase's confirmation email.
 *
 * Two shapes arrive here depending on the flow: a PKCE `code`, or a
 * `token_hash` when the email template links straight to the OTP. Both are
 * handled so a link opened on a different device than the one that signed up
 * still works — PKCE alone would fail there, because the code verifier lives in
 * a cookie on the original browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (providerError) {
    return loginError(request, "קישור האימות אינו תקף או שפג תוקפו. בקשו קישור חדש.");
  }

  if (isDemoMode()) {
    return NextResponse.redirect(new URL("/business", request.url));
  }

  const supabase = createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (error) {
      return loginError(request, "אימות הקישור נכשל. בקשו קישור חדש.");
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginError(request, "אימות הקישור נכשל. בקשו קישור חדש.");
    }
  } else {
    return loginError(request, "חסר קוד אימות בקישור.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginError(request, "אימות הקישור נכשל. בקשו קישור חדש.");
  }

  let destination: string;
  try {
    destination = await postAuthDestination(supabase, user.id);
  } catch {
    return loginError(request, "הקמת החשבון נכשלה. נסו להתחבר שוב.");
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
