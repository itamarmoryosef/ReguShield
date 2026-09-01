import { totalCommission } from "./commission";
import { DEMO_ADMIN_BUSINESSES, DEMO_ADMIN_PARTNERS, DEMO_ADMIN_USERS } from "./demo-data";
import { getCurrentProfile } from "./data";
import { isDemoMode } from "./env";
import { AppError } from "./errors";
import { createServiceClient } from "./supabase/admin";
import type { AdminBusinessRow, AdminPartner, AdminReferral, AdminUserRow } from "./types";
import {
  adminBusinessRowSchema,
  adminPartnerSchema,
  adminReferralSchema,
  adminUserRowSchema,
} from "./validation/schemas";

export type AdminOverview = {
  users: AdminUserRow[];
  businesses: AdminBusinessRow[];
  partners: AdminPartner[];
  partnerCount: number;
};

/** Throws unless the caller is a platform admin. */
export async function assertAdmin(): Promise<void> {
  if (isDemoMode()) return;

  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    throw new AppError("אין הרשאה לצפות בנתוני המערכת", { code: "NOT_ADMIN", status: 403 });
  }
}

/**
 * Platform-wide view for the owner.
 *
 * Email addresses live in auth.users, which no RLS policy can expose, so this
 * has to go through the service role. That makes the admin check inside this
 * function the real gate — a page-level check alone would be one forgotten
 * import away from leaking every customer's address.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  if (isDemoMode()) {
    return {
      users: DEMO_ADMIN_USERS,
      businesses: DEMO_ADMIN_BUSINESSES,
      partners: DEMO_ADMIN_PARTNERS,
      partnerCount: DEMO_ADMIN_PARTNERS.length,
    };
  }

  await assertAdmin();

  const admin = createServiceClient();

  const [authUsers, profiles, partners, businesses, billing] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, role, full_name, is_admin, partner_id, created_at"),
    admin.from("partners").select("id, name, created_at"),
    admin
      .from("businesses")
      .select("id, name, hp_number, address, owner_name, user_id, partner_id, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("business_billing")
      .select("business_id, subscription_price, partner_commission_rate, monthly_commission"),
  ]);

  const emailById = new Map((authUsers.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const partnerNameById = new Map((partners.data ?? []).map((p) => [p.id, p.name]));

  const users = (profiles.data ?? [])
    .map((row) =>
      adminUserRowSchema.safeParse({
        id: row.id,
        email: emailById.get(row.id) ?? "",
        role: row.role,
        full_name: row.full_name,
        is_admin: row.is_admin ?? false,
        partner_name: row.partner_id ? partnerNameById.get(row.partner_id) ?? null : null,
        created_at: row.created_at ?? "",
      }),
    )
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const rows = (businesses.data ?? [])
    .map((row) =>
      adminBusinessRowSchema.safeParse({
        id: row.id,
        name: row.name,
        hp_number: row.hp_number,
        address: row.address,
        owner_name: row.owner_name,
        owner_email: emailById.get(row.user_id) ?? null,
        partner_name: row.partner_id ? partnerNameById.get(row.partner_id) ?? null : null,
        created_at: row.created_at ?? "",
      }),
    )
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));

  const billingByBusiness = new Map(
    (billing.data ?? []).map((row) => [row.business_id, row]),
  );

  // A partner's email is the address of the profile linked to them, which is
  // how the admin knows where to send the payout.
  const partnerEmail = new Map(
    (profiles.data ?? [])
      .filter((row) => row.role === "partner" && row.partner_id)
      .map((row) => [row.partner_id as string, emailById.get(row.id) ?? null]),
  );

  const referralsByPartner = new Map<string, AdminReferral[]>();
  for (const row of businesses.data ?? []) {
    if (!row.partner_id) continue;
    const terms = billingByBusiness.get(row.id);

    const parsed = adminReferralSchema.safeParse({
      business_id: row.id,
      name: row.name,
      hp_number: row.hp_number,
      created_at: row.created_at ?? "",
      subscription_price: terms?.subscription_price ?? 0,
      partner_commission_rate: terms?.partner_commission_rate ?? 0,
      monthly_commission: terms?.monthly_commission ?? 0,
      owner_name: row.owner_name,
      owner_email: emailById.get(row.user_id) ?? null,
    });
    if (!parsed.success) continue;

    const list = referralsByPartner.get(row.partner_id) ?? [];
    list.push(parsed.data);
    referralsByPartner.set(row.partner_id, list);
  }

  const partnerRows = (partners.data ?? [])
    .map((row) => {
      const referrals = referralsByPartner.get(row.id) ?? [];
      return adminPartnerSchema.safeParse({
        id: row.id,
        name: row.name,
        contact_email: partnerEmail.get(row.id) ?? null,
        created_at: row.created_at ?? "",
        referrals,
        total_commission: totalCommission(referrals),
      });
    })
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
    .sort((a, b) => b.total_commission - a.total_commission);

  return {
    users,
    businesses: rows,
    partners: partnerRows,
    partnerCount: partnerRows.length,
  };
}
