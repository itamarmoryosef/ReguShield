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

/**
 * Links a business to a referring partner, or detaches it when given null.
 *
 * The billing terms are keyed by business and stay put, so reassigning moves
 * the existing commission to the new partner rather than resetting it.
 */
export async function assignBusinessPartner(
  businessId: string,
  partnerId: string | null,
): Promise<{ partnerName: string | null }> {
  try {
    const id = parseOrThrow(uuidSchema, businessId);
    const partner = partnerId ? parseOrThrow(uuidSchema, partnerId) : null;

    if (isDemoMode()) {
      return { partnerName: partnerId ? "משרד לדוגמה" : null };
    }

    await assertAdmin();

    const admin = createServiceClient();

    let partnerName: string | null = null;
    if (partner) {
      const { data } = await admin.from("partners").select("name").eq("id", partner).maybeSingle();
      if (!data) {
        throw new AppError("המשרד המבוקש לא נמצא", { code: "PARTNER_NOT_FOUND", status: 404 });
      }
      partnerName = data.name;
    }

    const { error } = await admin
      .from("businesses")
      .update({ partner_id: partner })
      .eq("id", id);

    if (error) {
      throw new AppError("שיוך המשרד נכשל", { code: "PARTNER_ASSIGN_FAILED", status: 502 });
    }

    revalidatePath("/admin");
    revalidatePath("/partner");
    revalidatePath("/partner/referrals");

    return { partnerName };
  } catch (error) {
    throw new AppError(toUserMessage(error), { code: "PARTNER_ASSIGN_FAILED", status: 500 });
  }
}
