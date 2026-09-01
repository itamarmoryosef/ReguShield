"use server";

import { revalidatePath } from "next/cache";
import { writeDemoActiveTemplateIds } from "@/lib/demo-store";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  setActiveTemplatesInputSchema,
  type SetActiveTemplatesInput,
} from "@/lib/validation/schemas";

export async function setActiveTemplates(
  input: SetActiveTemplatesInput,
): Promise<{ activeCount: number }> {
  try {
    const validInput = parseOrThrow(setActiveTemplatesInputSchema, input);
    const templateIds = Array.from(new Set(validInput.templateIds));

    if (isDemoMode()) {
      writeDemoActiveTemplateIds(templateIds);
      revalidatePath("/business");
      revalidatePath("/business/settings");
      return { activeCount: templateIds.length };
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc("set_business_active_templates", {
      p_business_id: validInput.businessId,
      p_template_ids: templateIds,
    });

    if (error) {
      throw new AppError(`עדכון הדרישות נכשל: ${error.message}`, {
        code: "SET_TEMPLATES_FAILED",
        status: 502,
      });
    }

    revalidatePath("/business");
    revalidatePath("/business/settings");
    revalidatePath("/partner");

    return { activeCount: typeof data === "number" ? data : templateIds.length };
  } catch (error) {
    throw new AppError(toUserMessage(error), {
      code: error instanceof AppError ? error.code : "SET_TEMPLATES_FAILED",
      status: error instanceof AppError ? error.status : 500,
      cause: error,
    });
  }
}
