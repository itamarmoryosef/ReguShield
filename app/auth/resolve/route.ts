import { NextResponse } from "next/server";
import { postAuthDestination } from "@/lib/auth/post-auth";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends someone who is already signed in to the right home screen.
 *
 * The browser-side half of the recovery flow establishes the session itself and
 * has no way to know whether the account is a business, a partner, or still
 * mid-onboarding, so it hands the decision back to the server here.
 */
export async function GET(request: Request) {
  if (isDemoMode()) {
    return NextResponse.redirect(new URL("/business", request.url));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bounce = (message: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  };

  if (!user) {
    return bounce("ההתחברות לא הושלמה. נסו שוב.");
  }

  try {
    return NextResponse.redirect(new URL(await postAuthDestination(supabase, user.id), request.url));
  } catch {
    return bounce("הקמת החשבון נכשלה. נסו להתחבר שוב.");
  }
}
