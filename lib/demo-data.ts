import { monthlyCommission, totalCommission } from "./commission";
import { computeDocumentStatus } from "./status";
import type {
  AdminBusinessRow,
  AdminPartner,
  AdminReferral,
  AdminUserRow,
  PartnerReferral,
  BusinessComplianceSummary,
  ClientDocument,
  DashboardDocument,
  DocumentTemplate,
} from "./types";

export const DEMO_TEMPLATES: DocumentTemplate[] = [
  { id: "11111111-1111-1111-1111-111111111001", name: "רישיון עסק", category: "Municipality", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111002", name: "אישור כיבוי אש", category: "Fire", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111003", name: "בדיקת מטפי כיבוי אש", category: "Fire", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111004", name: "בדיקת מערכת כיבוי במנדף", category: "Fire", default_validity_months: 6, is_default_active: false, applies_to_hint: "רק אם קיים מנדף / מטבח מבשל", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111005", name: "אישור משרד הבריאות", category: "Health", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111006", name: "יומן הדברה", category: "Health", default_validity_months: 3, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111007", name: "בדיקות מעבדה למים ומזון", category: "Health", default_validity_months: 6, is_default_active: false, applies_to_hint: "רק אם נדרשות דגימות מזון או מים", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111008", name: "אישור תברואן", category: "Health", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111009", name: "בדיקת מתקני גז", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם יש מתקן גז בעסק", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111010", name: "אישור משטרה", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "נדרש לפי פריט הרישוי, התפוסה ומכירת אלכוהול", generator_key: "police_form" },
  { id: "11111111-1111-1111-1111-111111111011", name: "ביטוח צד ג׳ וחבות מעבידים", category: "Municipality", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה לכל עסק מזון", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111012", name: "אישור נגישות", category: "Municipality", default_validity_months: 36, is_default_active: false, applies_to_hint: "רק אם יש שירות בישיבה לציבור", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111013", name: "הדרכת בטיחות בעבודה", category: "Health", default_validity_months: 12, is_default_active: true, applies_to_hint: "חובה כאשר מועסקים עובדים", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111014", name: "תעודת כשרות", category: "Health", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם העסק מצהיר על כשרות", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111015", name: "היתר הוצאת שולחנות וכיסאות", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם יש ישיבה בחוץ", generator_key: "outdoor_seating_request" },
  { id: "11111111-1111-1111-1111-111111111016", name: "רישיון למכירת אלכוהול", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם נמכר אלכוהול", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111017", name: "היתר שילוט", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם קיים שילוט חוץ", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111018", name: "אישור מערכת מצלמות ואבטחה", category: "Municipality", default_validity_months: 12, is_default_active: false, applies_to_hint: "רק אם נדרש הסדר אבטחה", generator_key: null },
  { id: "11111111-1111-1111-1111-111111111019", name: "תצהיר בטיחות אש – מסלול מקוצר", category: "Fire", default_validity_months: 12, is_default_active: true, applies_to_hint: "תצהיר בעל העסק במסלול רישוי מקוצר", generator_key: "fire_safety_declaration" },
  { id: "11111111-1111-1111-1111-111111111020", name: "תצהיר נגישות בעסק", category: "Municipality", default_validity_months: 12, is_default_active: true, applies_to_hint: "תצהיר בעל העסק על התקיימות הוראות הנגישות", generator_key: "accessibility_affidavit" },
];

function isoOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const DEMO_DOCS: Partial<Record<string, Pick<ClientDocument, "issue_date" | "expiry_date" | "file_path">>> = {
  "11111111-1111-1111-1111-111111111001": { issue_date: isoOffset(-200), expiry_date: isoOffset(200), file_path: "demo/license.jpg" },
  "11111111-1111-1111-1111-111111111002": { issue_date: isoOffset(-300), expiry_date: isoOffset(-12), file_path: "demo/fire.jpg" },
  "11111111-1111-1111-1111-111111111003": { issue_date: isoOffset(-330), expiry_date: isoOffset(28), file_path: "demo/extinguishers.jpg" },
  "11111111-1111-1111-1111-111111111005": { issue_date: isoOffset(-80), expiry_date: isoOffset(280), file_path: "demo/health.jpg" },
  "11111111-1111-1111-1111-111111111006": { issue_date: isoOffset(-100), expiry_date: isoOffset(-5), file_path: "demo/pest.jpg" },
  "11111111-1111-1111-1111-111111111008": { issue_date: isoOffset(-40), expiry_date: isoOffset(40), file_path: "demo/sanitation.jpg" },
  "11111111-1111-1111-1111-111111111011": { issue_date: isoOffset(-100), expiry_date: isoOffset(260), file_path: "demo/insurance.jpg" },
  "11111111-1111-1111-1111-111111111014": { issue_date: isoOffset(-20), expiry_date: isoOffset(340), file_path: "demo/kashrut.jpg" },
};

export function demoDocumentFor(templateId: string): ClientDocument | null {
  const raw = DEMO_DOCS[templateId];
  if (!raw) return null;

  return {
    id: templateId.replace("11111111", "22222222"),
    business_id: "00000000-0000-4000-8000-000000000010",
    template_id: templateId,
    status: computeDocumentStatus(raw.expiry_date),
    file_path: raw.file_path ?? null,
    issue_date: raw.issue_date ?? null,
    expiry_date: raw.expiry_date ?? null,
    created_at: new Date().toISOString(),
  };
}

export function getDemoDashboardDocuments(activeTemplateIds?: string[]): DashboardDocument[] {
  const active = activeTemplateIds
    ? new Set(activeTemplateIds)
    : new Set(DEMO_TEMPLATES.filter((template) => template.is_default_active).map((t) => t.id));

  return DEMO_TEMPLATES.filter((template) => active.has(template.id)).map((template) => {
    const document = demoDocumentFor(template.id);
    return {
      ...template,
      document,
      status: document ? document.status : "missing",
    };
  });
}

export const DEMO_PORTFOLIO: BusinessComplianceSummary[] = [
  {
    business_id: "00000000-0000-4000-8000-000000000031",
    partner_id: "00000000-0000-4000-8000-000000000020",
    name: "מסעדת הים התיכון",
    hp_number: "514812345",
    address: "רח׳ דיזנגוף 101, תל אביב",
    created_at: "2024-03-12T00:00:00.000Z",
    required_count: 14,
    missing_count: 4,
    expired_count: 2,
    expiring_soon_count: 2,
    valid_count: 6,
  },
  {
    business_id: "00000000-0000-4000-8000-000000000032",
    partner_id: "00000000-0000-4000-8000-000000000020",
    name: "גראן־מה בית קפה",
    hp_number: "515998877",
    address: "שדרות בן גוריון 12, חיפה",
    created_at: "2024-07-01T00:00:00.000Z",
    required_count: 9,
    missing_count: 1,
    expired_count: 0,
    expiring_soon_count: 2,
    valid_count: 6,
  },
  {
    business_id: "00000000-0000-4000-8000-000000000033",
    partner_id: "00000000-0000-4000-8000-000000000020",
    name: "פיתה מלך",
    hp_number: "513221100",
    address: "שוק מחנה יהודה, ירושלים",
    created_at: "2025-01-18T00:00:00.000Z",
    required_count: 7,
    missing_count: 4,
    expired_count: 2,
    expiring_soon_count: 0,
    valid_count: 1,
  },
  {
    business_id: "00000000-0000-4000-8000-000000000034",
    partner_id: "00000000-0000-4000-8000-000000000020",
    name: "סושי בר אילת",
    hp_number: "516440022",
    address: "טיילת המלך שלמה, אילת",
    created_at: "2025-11-04T00:00:00.000Z",
    required_count: 11,
    missing_count: 0,
    expired_count: 0,
    expiring_soon_count: 1,
    valid_count: 10,
  },
];

export const DEMO_ADMIN_USERS: AdminUserRow[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@demo-restaurant.co.il",
    role: "business",
    full_name: "ישראל ישראלי",
    is_admin: true,
    partner_name: null,
    created_at: "2025-11-04T09:12:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "office@regushield-consulting.co.il",
    role: "partner",
    full_name: "נועה כהן",
    is_admin: false,
    partner_name: "רגולשילד ייעוץ ורישוי",
    created_at: "2025-09-21T14:03:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "info@pita-melech.co.il",
    role: "business",
    full_name: "אבי מזרחי",
    is_admin: false,
    partner_name: "רגולשילד ייעוץ ורישוי",
    created_at: "2025-01-18T08:40:00.000Z",
  },
];

/** Prices and rates deliberately differ per client to exercise the maths. */
const DEMO_TERMS: { price: number; rate: number }[] = [
  { price: 290, rate: 20 },
  { price: 150, rate: 15 },
  { price: 150, rate: 12.5 },
  { price: 390, rate: 15 },
];

export const DEMO_REFERRALS: PartnerReferral[] = DEMO_PORTFOLIO.map((row, index) => {
  const terms = DEMO_TERMS[index % DEMO_TERMS.length];
  return {
    business_id: row.business_id,
    name: row.name,
    hp_number: row.hp_number,
    created_at: row.created_at,
    subscription_price: terms.price,
    partner_commission_rate: terms.rate,
    monthly_commission: monthlyCommission(terms.price, terms.rate),
  };
});

export const DEMO_ADMIN_PARTNERS: AdminPartner[] = [
  {
    id: "00000000-0000-4000-8000-000000000020",
    name: "רגולשילד ייעוץ ורישוי",
    contact_email: "office@regushield-consulting.co.il",
    created_at: "2025-09-21T14:03:00.000Z",
    referrals: DEMO_REFERRALS.map(
      (row, index): AdminReferral => ({
        ...row,
        owner_name: ["ישראל ישראלי", "נועה כהן", "אבי מזרחי", "דנה לוי"][index] ?? null,
        owner_email: DEMO_ADMIN_USERS[index % DEMO_ADMIN_USERS.length].email,
      }),
    ),
    total_commission: totalCommission(DEMO_REFERRALS),
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    name: "לוי רישוי עסקים",
    contact_email: "levi@licensing.co.il",
    created_at: "2026-02-11T10:00:00.000Z",
    referrals: [],
    total_commission: 0,
  },
];

export const DEMO_ADMIN_BUSINESSES: AdminBusinessRow[] = DEMO_PORTFOLIO.map((row, index) => ({
  id: row.business_id,
  name: row.name,
  hp_number: row.hp_number,
  address: row.address,
  owner_name: ["ישראל ישראלי", "נועה כהן", "אבי מזרחי", "דנה לוי"][index] ?? null,
  owner_email: DEMO_ADMIN_USERS[index % DEMO_ADMIN_USERS.length].email,
  partner_name: "רגולשילד ייעוץ ורישוי",
  created_at: row.created_at,
}));
