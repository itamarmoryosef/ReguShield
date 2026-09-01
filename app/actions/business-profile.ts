"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/data";
import { writeDemoBusinessProfile } from "@/lib/demo-store";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validation/parse";
import { businessProfileInputSchema, type BusinessProfileInput } from "@/lib/validation/schemas";

export async function saveBusinessProfile(
  input: BusinessProfileInput,
): Promise<{ savedAt: string }> {
  try {
    const profile = parseOrThrow(businessProfileInputSchema, input);
    const savedAt = new Date().toISOString();

    if (isDemoMode()) {
      writeDemoBusinessProfile(profile);
    } else {
      const business = await getCurrentBusiness();
      if (!business) {
        throw new AppError("לא נמצא עסק מקושר לחשבון", {
          code: "BUSINESS_NOT_FOUND",
          status: 404,
        });
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("businesses")
        .update({
          name: profile.name,
          hp_number: profile.hp_number,
          address: profile.address,
          owner_name: profile.owner_name,
          phone: profile.phone,
          email: profile.email,
          serial_number: profile.serial_number,
          file_number: profile.file_number,
          business_description: profile.business_description,
          total_area: profile.total_area,
          built_area: profile.built_area,
          professional_approvals: profile.professional_approvals,
          licensing_item: profile.licensing_item,
          max_capacity: profile.max_capacity,
          employee_count: profile.employee_count,
          sells_alcohol: profile.sells_alcohol,
          mobile: profile.mobile,
          fax: profile.fax,
          manager_name: profile.manager_name,
          manager_phone: profile.manager_phone,
          shift_manager_phone: profile.shift_manager_phone,
          security_phone: profile.security_phone,
          general_description: profile.general_description,
          security_measures: profile.security_measures,
          security_notes: profile.security_notes,
          declarer_role: profile.declarer_role,
          accessibility_consultant_name: profile.accessibility_consultant_name,
          accessibility_consultant_id: profile.accessibility_consultant_id,
          accessibility_consultant_registry: profile.accessibility_consultant_registry,
          accessibility_consultant_registry_number:
            profile.accessibility_consultant_registry_number,
          profile_completed_at: savedAt,
        })
        .eq("id", business.id);

      if (error) {
        throw new AppError(`שמירת פרטי העסק נכשלה: ${error.message}`, {
          code: "SAVE_PROFILE_FAILED",
          status: 502,
        });
      }
    }

    revalidatePath("/business");
    revalidatePath("/business/profile");
    revalidatePath("/partner");

    return { savedAt };
  } catch (error) {
    throw new AppError(toUserMessage(error), {
      code: error instanceof AppError ? error.code : "SAVE_PROFILE_FAILED",
      status: error instanceof AppError ? error.status : 500,
      cause: error,
    });
  }
}
