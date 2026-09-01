import { DEMO_ADMIN_BUSINESSES, DEMO_ADMIN_USERS } from "./demo-data";
import { getCurrentProfile } from "./data";
import { isDemoMode } from "./env";
import { AppError } from "./errors";
import { createServiceClient } from "./supabase/admin";
import type { AdminBusinessRow, AdminUserRow } from "./types";
import { adminBusinessRowSchema, adminUserRowSchema } from "./validation/schemas";

export type AdminOverview = {
  users: AdminUserRow[];
  businesses: AdminBusinessRow[];
  partnerCount: number;
};

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
      partnerCount: new Set(DEMO_ADMIN_USERS.map((u) => u.partner_name).filter(Boolean)).size,
    };
  }

  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    throw new AppError("אין הרשאה לצפות בנתוני המערכת", { code: "NOT_ADMIN", status: 403 });
  }

  const admin = createServiceClient();

  const [authUsers, profiles, partners, businesses] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, role, full_name, is_admin, partner_id, created_at"),
    admin.from("partners").select("id, name"),
    admin
      .from("businesses")
      .select("id, name, hp_number, address, owner_name, user_id, partner_id, created_at")
      .order("created_at", { ascending: false }),
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

  return { users, businesses: rows, partnerCount: (partners.data ?? []).length };
}
