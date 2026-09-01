"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { PartnerBrandingInput } from "@/lib/types";
import { parseOrThrow } from "@/lib/validation/parse";
import { partnerBrandingInputSchema } from "@/lib/validation/schemas";

export async function updatePartnerBranding(
  input: PartnerBrandingInput,
): Promise<{ savedAt: string }> {
  try {
    const branding = parseOrThrow(partnerBrandingInputSchema, input);
    const savedAt = new Date().toISOString();

    if (isDemoMode()) {
      return { savedAt };
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError("נדרשת התחברות", { code: "NOT_AUTHENTICATED", status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        // Empty inputs are cleared rather than stored as "", so the reminder
        // sender can fall back on the default text with a plain null check.
        brand_name: branding.brand_name || null,
        brand_logo_url: branding.brand_logo_url || null,
        custom_reminder_text: branding.custom_reminder_text || null,
      })
      .eq("id", user.id);

    if (error) {
      throw new AppError("שמירת המיתוג נכשלה", { code: "BRANDING_SAVE_FAILED", status: 502 });
    }

    revalidatePath("/partner");
    revalidatePath("/partner/settings");
    return { savedAt };
  } catch (error) {
    throw new AppError(toUserMessage(error), { code: "BRANDING_SAVE_FAILED", status: 500 });
  }
}
