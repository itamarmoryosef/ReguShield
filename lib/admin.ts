import { totalCommission } from "./commission";
import {
  DEMO_ADMIN_BUSINESSES,
  DEMO_ADMIN_PARTNERS,
  DEMO_ADMIN_USERS,
  DEMO_REFERRALS,
  DEMO_TEMPLATES,
  getDemoDashboardDocuments,
} from "./demo-data";
import { readDemoActiveTemplateIds } from "./demo-store";
import { getCurrentBusiness, getCurrentProfile } from "./data";
import { isDemoMode } from "./env";
import { AppError } from "./errors";
import { resolveCardStatus } from "./status";
import { createServiceClient } from "./supabase/admin";
import type {
  AdminBusinessRow,
  AdminPartner,
  AdminReferral,
  AdminUserRow,
  Business,
  DashboardDocument,
} from "./types";
import {
  adminBusinessRowSchema,
  adminPartnerSchema,
  adminReferralSchema,
  adminUserRowSchema,
  businessSchema,
  clientDocumentSchema,
  documentTemplateSchema,
  uuidSchema,
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
  const termsByBusiness = new Map((billing.data ?? []).map((row) => [row.business_id, row]));

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
    .map((row) => {
      const terms = termsByBusiness.get(row.id);
      return adminBusinessRowSchema.safeParse({
        id: row.id,
        name: row.name,
        hp_number: row.hp_number,
        address: row.address,
        owner_name: row.owner_name,
        owner_email: emailById.get(row.user_id) ?? null,
        partner_id: row.partner_id,
        partner_name: row.partner_id ? partnerNameById.get(row.partner_id) ?? null : null,
        subscription_price: terms?.subscription_price ?? 0,
        partner_commission_rate: terms?.partner_commission_rate ?? 0,
        monthly_commission: terms?.monthly_commission ?? 0,
        created_at: row.created_at ?? "",
      });
    })
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));

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
    const terms = termsByBusiness.get(row.id);

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

export type AdminBusinessFile = {
  business: Business;
  documents: DashboardDocument[];
  activeCount: number;
  catalogCount: number;
  ownerEmail: string | null;
  partnerName: string | null;
  billing: { subscription_price: number; partner_commission_rate: number; monthly_commission: number };
};

/**
 * One client's file as the platform owner sees it.
 *
 * Goes through the service role rather than the caller's own client because
 * can_access_business — which gates the checklist and the documents — only
 * knows about the owner and their partner. Under RLS an admin would get an
 * empty checklist back and quietly conclude the client had uploaded nothing.
 */
export async function getAdminBusinessFile(businessId: string): Promise<AdminBusinessFile | null> {
  if (isDemoMode()) {
    const documents = getDemoDashboardDocuments(readDemoActiveTemplateIds());
    const business = await getCurrentBusiness();
    if (!business) return null;

    return {
      business,
      documents,
      activeCount: documents.length,
      catalogCount: DEMO_TEMPLATES.length,
      ownerEmail: DEMO_ADMIN_USERS[0].email,
      partnerName: DEMO_ADMIN_PARTNERS[0].name,
      billing: {
        subscription_price: DEMO_REFERRALS[0].subscription_price,
        partner_commission_rate: DEMO_REFERRALS[0].partner_commission_rate,
        monthly_commission: DEMO_REFERRALS[0].monthly_commission,
      },
    };
  }

  await assertAdmin();

  const id = uuidSchema.safeParse(businessId);
  if (!id.success) return null;

  const admin = createServiceClient();

  const { data: businessRow } = await admin
    .from("businesses")
    .select("*")
    .eq("id", id.data)
    .maybeSingle();

  const business = businessSchema.safeParse(businessRow);
  if (!business.success) return null;

  const [templates, documents, active, terms, partner] = await Promise.all([
    admin.from("document_templates").select("*").order("category").order("name"),
    admin.from("client_documents").select("*").eq("business_id", id.data),
    admin.from("business_active_checklist").select("template_id").eq("business_id", id.data),
    admin
      .from("business_billing")
      .select("subscription_price, partner_commission_rate, monthly_commission")
      .eq("business_id", id.data)
      .maybeSingle(),
    business.data.partner_id
      ? admin.from("partners").select("name").eq("id", business.data.partner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const catalogResult = documentTemplateSchema.array().safeParse(templates.data ?? []);
  const catalog = catalogResult.success ? catalogResult.data : [];

  const docsResult = clientDocumentSchema.array().safeParse(documents.data ?? []);
  const byTemplate = new Map((docsResult.success ? docsResult.data : []).map((d) => [d.template_id, d]));

  const activeIds = new Set(
    (active.data ?? [])
      .map((row) => row.template_id)
      .filter((value): value is string => typeof value === "string"),
  );

  const cards: DashboardDocument[] = catalog
    .filter((template) => activeIds.has(template.id))
    .map((template) => {
      const document = byTemplate.get(template.id) ?? null;
      return { ...template, document, status: resolveCardStatus(document) };
    });

  const { data: owner } = await admin.auth.admin.getUserById(business.data.user_id);

  return {
    business: business.data,
    documents: cards,
    activeCount: cards.length,
    catalogCount: catalog.length,
    ownerEmail: owner?.user?.email ?? null,
    partnerName: (partner.data as { name?: string } | null)?.name ?? null,
    billing: {
      subscription_price: Number(terms.data?.subscription_price ?? 0),
      partner_commission_rate: Number(terms.data?.partner_commission_rate ?? 0),
      monthly_commission: Number(terms.data?.monthly_commission ?? 0),
    },
  };
}
