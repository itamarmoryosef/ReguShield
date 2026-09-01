import { DEMO_PORTFOLIO, DEMO_REFERRALS, DEMO_TEMPLATES, getDemoDashboardDocuments } from "./demo-data";
import { readDemoActiveTemplateIds, readDemoBusinessProfile } from "./demo-store";
import { isDemoMode } from "./env";
import { resolveCardStatus } from "./status";
import { createClient } from "./supabase/server";
import type {
  Business,
  BusinessComplianceSummary,
  ChecklistTemplate,
  ClientDocument,
  DashboardDocument,
  DocumentTemplate,
  Partner,
  PartnerReferral,
  Profile,
} from "./types";
import {
  businessComplianceSummarySchema,
  businessSchema,
  clientDocumentSchema,
  documentTemplateSchema,
  partnerReferralSchema,
  partnerSchema,
  profileSchema,
} from "./validation/schemas";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoMode()) {
    return {
      id: "00000000-0000-4000-8000-000000000001",
      role: "business",
      partner_id: null,
      full_name: "בעל העסק (הדגמה)",
      // Demo mode opens the admin screen so the layout can be reviewed without
      // a real account.
      is_admin: true,
      brand_name: "רגולשילד ייעוץ ורישוי",
      brand_logo_url: null,
      custom_reminder_text: "",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, partner_id, full_name, is_admin, brand_name, brand_logo_url, custom_reminder_text, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = profileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getCurrentBusiness(): Promise<Business | null> {
  if (isDemoMode()) {
    const saved = readDemoBusinessProfile();
    return {
      id: "00000000-0000-4000-8000-000000000010",
      user_id: "00000000-0000-4000-8000-000000000001",
      partner_id: "00000000-0000-4000-8000-000000000020",
      name: saved?.name ?? "מסעדת הדגמה",
      hp_number: saved?.hp_number ?? "514000001",
      address: saved?.address ?? "רח׳ אלנבי 50, תל אביב",
      owner_name: saved?.owner_name ?? "ישראל ישראלי",
      phone: saved?.phone ?? "03-1234567",
      email: saved?.email ?? "office@demo-restaurant.co.il",
      serial_number: saved?.serial_number ?? "4.2 א",
      file_number: saved?.file_number ?? "2024-1187",
      business_description: saved?.business_description ?? "מסעדה - הכנה והגשה של מזון",
      total_area: saved?.total_area ?? "180",
      built_area: saved?.built_area ?? "120",
      professional_approvals: saved?.professional_approvals ?? [
        "אישור תקינות מתקן גז - טכנאי גז מוסמך",
        "אישור ניקוי מנדפים - חברת ניקוי מוסמכת",
      ],
      // A restaurant that serves alcohol, so the police form is required and the
      // exemption can be demonstrated by turning the alcohol answer off.
      licensing_item: saved?.licensing_item ?? "4.2a",
      max_capacity: saved?.max_capacity ?? 120,
      employee_count: saved?.employee_count ?? 14,
      sells_alcohol: saved?.sells_alcohol ?? true,
      mobile: saved?.mobile ?? "052-1234567",
      fax: saved?.fax ?? "03-1234568",
      manager_name: saved?.manager_name ?? "דנה לוי",
      manager_phone: saved?.manager_phone ?? "052-7654321",
      shift_manager_phone: saved?.shift_manager_phone ?? "053-1122334",
      security_phone: saved?.security_phone ?? "054-9988776",
      general_description:
        saved?.general_description ??
        "מסעדה בקומת קרקע עם אולם אירוח, מטבח מאחור וחצר פתוחה לרחוב.",
      security_measures: saved?.security_measures ?? {
        guards: "missing",
        fence: "partial",
        controlRoom: "missing",
        alarm: "exists",
        cameras: "exists",
      },
      security_notes: saved?.security_notes ?? {
        guards: "",
        fence: "גדר בחזית בלבד",
        controlRoom: "",
        alarm: "מחוברת למוקד חברת אבטחה",
        cameras: "",
      },
      declarer_role: saved?.declarer_role ?? "owner",
      accessibility_consultant_name: saved?.accessibility_consultant_name ?? "",
      accessibility_consultant_id: saved?.accessibility_consultant_id ?? "",
      accessibility_consultant_registry: saved?.accessibility_consultant_registry ?? "",
      accessibility_consultant_registry_number:
        saved?.accessibility_consultant_registry_number ?? "",
      profile_completed_at: saved ? new Date().toISOString() : null,
      templates_configured_at: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).maybeSingle();
  const parsed = businessSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getCurrentPartner(): Promise<Partner | null> {
  if (isDemoMode()) {
    return {
      id: "00000000-0000-4000-8000-000000000020",
      name: "רגולשילד ייעוץ ורישוי",
      logo_url: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const profile = await getCurrentProfile();
  if (!profile?.partner_id) return null;

  const { data } = await supabase.from("partners").select("*").eq("id", profile.partner_id).maybeSingle();
  const parsed = partnerSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getTemplates(): Promise<DocumentTemplate[]> {
  if (isDemoMode()) return DEMO_TEMPLATES;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .order("category")
    .order("name");

  if (error || !data) return DEMO_TEMPLATES;

  const parsed = documentTemplateSchema.array().safeParse(data);
  return parsed.success ? parsed.data : DEMO_TEMPLATES;
}

export async function getActiveTemplateIds(businessId: string): Promise<string[]> {
  if (isDemoMode()) return readDemoActiveTemplateIds();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("business_active_checklist")
    .select("template_id")
    .eq("business_id", businessId);

  if (error || !data) return [];

  return data
    .map((row) => (typeof row.template_id === "string" ? row.template_id : null))
    .filter((value): value is string => value !== null);
}

export async function getBusinessDashboardDocuments(
  businessId: string,
): Promise<DashboardDocument[]> {
  if (isDemoMode()) return getDemoDashboardDocuments(readDemoActiveTemplateIds());

  const supabase = createClient();
  const [{ data: templates }, { data: documents }, activeIds] = await Promise.all([
    supabase.from("document_templates").select("*").order("category").order("name"),
    supabase.from("client_documents").select("*").eq("business_id", businessId),
    getActiveTemplateIds(businessId),
  ]);

  const catalogResult = documentTemplateSchema.array().safeParse(templates ?? []);
  const catalog = catalogResult.success ? catalogResult.data : DEMO_TEMPLATES;

  const docsResult = clientDocumentSchema.array().safeParse(documents ?? []);
  const docs = docsResult.success ? docsResult.data : [];
  const byTemplate = new Map<string, ClientDocument>(docs.map((doc) => [doc.template_id, doc]));
  const active = new Set(activeIds);

  return catalog
    .filter((template) => active.has(template.id))
    .map((template) => {
      const document = byTemplate.get(template.id) ?? null;
      return {
        ...template,
        document,
        status: resolveCardStatus(document),
      };
    });
}

export async function getBusinessChecklist(businessId: string): Promise<ChecklistTemplate[]> {
  const [catalog, activeIds] = await Promise.all([
    getTemplates(),
    getActiveTemplateIds(businessId),
  ]);
  const active = new Set(activeIds);

  if (isDemoMode()) {
    const { demoDocumentFor } = await import("./demo-data");
    return catalog.map((template) => ({
      ...template,
      active: active.has(template.id),
      hasDocument: demoDocumentFor(template.id) !== null,
    }));
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("client_documents")
    .select("template_id")
    .eq("business_id", businessId);

  const withDocuments = new Set(
    (data ?? [])
      .map((row) => (typeof row.template_id === "string" ? row.template_id : null))
      .filter((value): value is string => value !== null),
  );

  return catalog.map((template) => ({
    ...template,
    active: active.has(template.id),
    hasDocument: withDocuments.has(template.id),
  }));
}

export async function getPartnerPortfolio(
  partnerId: string,
): Promise<BusinessComplianceSummary[]> {
  if (isDemoMode()) return DEMO_PORTFOLIO;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("business_compliance_summary")
    .select("*")
    .eq("partner_id", partnerId)
    .order("name");

  if (error || !data) return [];

  const parsed = businessComplianceSummarySchema.array().safeParse(data);
  return parsed.success ? parsed.data : [];
}

/**
 * Referred clients with the commission each one earns.
 *
 * The view carries the figure the database computed, so the partner sees the
 * same number the admin will pay out.
 */
export async function getPartnerReferrals(partnerId: string): Promise<PartnerReferral[]> {
  if (isDemoMode()) return DEMO_REFERRALS;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("partner_referral_earnings")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const parsed = partnerReferralSchema.array().safeParse(data);
  return parsed.success ? parsed.data : [];
}
