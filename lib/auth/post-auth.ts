import { isProfileComplete } from "@/lib/business-profile";
import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { businessSchema } from "@/lib/validation/schemas";

type ServerClient = ReturnType<typeof createClient>;

/**
 * Reads the caller's role, provisioning the tenant rows first if they are not
 * there yet.
 *
 * A verified user can legitimately arrive without a profile: the rows are
 * created after email confirmation, so anything that interrupted the callback
 * leaves the account half-built. Provisioning is idempotent, so retrying on the
 * next sign-in repairs it instead of trapping the user on an empty dashboard.
 */
export async function resolveRole(supabase: ServerClient, userId: string): Promise<UserRole | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "partner" || profile?.role === "business") {
    return profile.role;
  }

  const { data: provisioned } = await supabase.rpc("ensure_account_provisioned");
  return provisioned === "partner" || provisioned === "business" ? provisioned : null;
}

/**
 * Where to send someone who just authenticated. Businesses that have not filled
 * in the details every generated form depends on go through the wizard first.
 */
export async function postAuthDestination(supabase: ServerClient, userId: string): Promise<string> {
  const role = await resolveRole(supabase, userId);
  if (role === "partner") return "/partner";
  if (role === null) return "/login?error=" + encodeURIComponent("החשבון לא הוגדר. נסו להתחבר שוב.");

  const { data } = await supabase.from("businesses").select("*").eq("user_id", userId).maybeSingle();
  const business = businessSchema.safeParse(data);
  if (!business.success) return "/onboarding";

  return isProfileComplete(business.data) ? "/business" : "/onboarding";
}
