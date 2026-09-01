"use server";

import { redirect } from "next/navigation";
import { resolveRole } from "@/lib/auth/post-auth";
import { isDemoMode, siteUrl } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseFormData } from "@/lib/validation/parse";
import {
  emailSchema,
  liveSignInSchema,
  liveSignUpSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

function authErrorRedirect(path: "/login" | "/signup", error: unknown): never {
  redirect(`${path}?error=${encodeURIComponent(toUserMessage(error))}`);
}

export async function signIn(formData: FormData) {
  try {
    const schema = isDemoMode() ? signInSchema : liveSignInSchema;
    const input = parseFormData(schema, formData);

    if (isDemoMode()) {
      redirect(input.role === "partner" ? "/partner" : "/business");
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      if (/confirm/i.test(error.message)) {
        redirect(`/verify-email?email=${encodeURIComponent(input.email)}`);
      }
      throw new AppError("ההתחברות נכשלה. בדקו את הפרטים.", { code: "SIGNIN_FAILED", status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new AppError("ההתחברות נכשלה. בדקו את הפרטים.", { code: "SIGNIN_FAILED", status: 401 });
    }

    const role = await resolveRole(supabase, user.id);
    redirect(role === "partner" ? "/partner" : "/business");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    authErrorRedirect("/login", error);
  }
}

export async function signUp(formData: FormData) {
  try {
    const schema = isDemoMode() ? signUpSchema : liveSignUpSchema;
    const input = parseFormData(schema, formData);

    if (isDemoMode()) {
      // New business accounts continue through the onboarding wizard.
      redirect(input.role === "partner" ? "/partner" : "/onboarding");
    }

    const supabase = createClient();
    // The tenant rows are not created here. Email confirmation means there is no
    // session yet, so the details ride along as metadata and
    // ensure_account_provisioned turns them into a profile once the address is
    // verified.
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback`,
        data: {
          signup_role: input.role,
          full_name: input.full_name,
          organization: input.organization,
          hp_number: input.hp_number,
          address: input.address,
        },
      },
    });

    if (error || !data.user) {
      throw new AppError(error?.message || "ההרשמה נכשלה", { code: "SIGNUP_FAILED", status: 400 });
    }

    redirect(`/verify-email?email=${encodeURIComponent(input.email)}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    authErrorRedirect("/signup", error);
  }
}

export async function resendVerificationEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const target = `/verify-email?email=${encodeURIComponent(email)}`;

  if (isDemoMode()) {
    redirect(`${target}&sent=1`);
  }

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    redirect(`${target}&error=${encodeURIComponent("כתובת הדוא״ל אינה תקינה")}`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error) {
    // Supabase rate limits confirmation emails to one per minute.
    const message = /security purposes|rate limit|too many/i.test(error.message)
      ? "כבר נשלח קישור לאחרונה. נסו שוב בעוד דקה."
      : "שליחת הקישור נכשלה. נסו שוב.";
    redirect(`${target}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${target}&sent=1`);
}

export async function signOut() {
  if (!isDemoMode()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
