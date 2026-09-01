"use server";

import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseFormData } from "@/lib/validation/parse";
import { liveSignInSchema, liveSignUpSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";

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
      throw new AppError("ההתחברות נכשלה. בדקו את הפרטים.", { code: "SIGNIN_FAILED", status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new AppError("ההתחברות נכשלה. בדקו את הפרטים.", { code: "SIGNIN_FAILED", status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    redirect(profile?.role === "partner" ? "/partner" : "/business");
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
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      throw new AppError(error?.message || "ההרשמה נכשלה", { code: "SIGNUP_FAILED", status: 400 });
    }

    if (input.role === "partner") {
      const { error: rpcError } = await supabase.rpc("register_partner_account", {
        p_full_name: input.full_name,
        p_organization: input.organization,
      });
      if (rpcError) {
        throw new AppError("יצירת משרד הייעוץ נכשלה", { code: "REGISTER_PARTNER_FAILED", status: 502 });
      }
      redirect("/partner");
    }

    const { error: rpcError } = await supabase.rpc("register_business_account", {
      p_full_name: input.full_name,
      p_business_name: input.organization,
      p_hp_number: input.hp_number,
      p_address: input.address,
    });

    if (rpcError) {
      throw new AppError("יצירת בית העסק נכשלה", { code: "REGISTER_BUSINESS_FAILED", status: 502 });
    }

    redirect("/business");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    authErrorRedirect("/signup", error);
  }
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
