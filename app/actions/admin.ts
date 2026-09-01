"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { monthlyCommission } from "@/lib/commission";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BusinessBillingInput } from "@/lib/types";
import { parseOrThrow } from "@/lib/validation/parse";
import { businessBillingInputSchema, uuidSchema } from "@/lib/validation/schemas";

export type BillingSaveResult = {
  subscription_price: number;
  partner_commission_rate: number;
  monthly_commission: number;
};

/**
 * Sets what one client pays and what their referring partner earns on it.
 *
 * Admin-only: these numbers decide real payouts, and no other role has a write
 * policy on the table.
 */
export async function updateBusinessBilling(
  businessId: string,
  input: BusinessBillingInput,
): Promise<BillingSaveResult> {
  try {
    const id = parseOrThrow(uuidSchema, businessId);
    const terms = parseOrThrow(businessBillingInputSchema, input);

    if (isDemoMode()) {
      return {
        ...terms,
        monthly_commission: monthlyCommission(
          terms.subscription_price,
          terms.partner_commission_rate,
        ),
      };
    }

    await assertAdmin();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createServiceClient();
    const { data, error } = await admin
      .from("business_billing")
      .upsert(
        {
          business_id: id,
          subscription_price: terms.subscription_price,
          partner_commission_rate: terms.partner_commission_rate,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "business_id" },
      )
      .select("subscription_price, partner_commission_rate, monthly_commission")
      .single();

    if (error || !data) {
      throw new AppError("שמירת תנאי החיוב נכשלה", { code: "BILLING_SAVE_FAILED", status: 502 });
    }

    revalidatePath("/admin");
    revalidatePath("/partner/referrals");

    // The commission comes back from the generated column, so the screen shows
    // the figure that will actually be paid rather than a local estimate.
    return {
      subscription_price: Number(data.subscription_price),
      partner_commission_rate: Number(data.partner_commission_rate),
      monthly_commission: Number(data.monthly_commission),
    };
  } catch (error) {
    throw new AppError(toUserMessage(error), { code: "BILLING_SAVE_FAILED", status: 500 });
  }
}
