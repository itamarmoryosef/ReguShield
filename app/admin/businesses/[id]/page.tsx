import { ArrowRight, Building2, Coins, FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { AppHeader } from "@/components/layout/AppHeader";
import { getAdminBusinessFile } from "@/lib/admin";
import { formatShekels } from "@/lib/commission";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("he-IL");
}

export default async function AdminBusinessFilePage({ params }: { params: { id: string } }) {
  const demo = isDemoMode();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!demo && !profile.is_admin) {
    redirect(profile.role === "partner" ? "/partner" : "/business");
  }

  const file = await getAdminBusinessFile(params.id);
  if (!file) {
    notFound();
  }

  const { business, documents, billing } = file;
  const needsAttention = documents.filter((doc) => doc.status !== "valid").length;

  return (
    <>
      <AppHeader title="תיק לקוח" subtitle={business.name} demo={demo} />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/admin?tab=businesses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לניהול המערכת
          </Link>

          <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {business.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                תצוגת קריאה בלבד. שינויים בתיק מתבצעים על ידי הלקוח.
              </p>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
              {needsAttention === 0
                ? "כל המסמכים בתוקף"
                : `${needsAttention} מסמכים דורשים טיפול`}
            </span>
          </header>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel icon={Building2} title="פרטי העסק">
            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="שם העסק" value={business.name} />
              <Row label="ח.פ / ע.מ" value={business.hp_number} ltr />
              <Row label="כתובת" value={business.address} />
              <Row label="שם הבעלים" value={business.owner_name} />
              <Row label="דוא״ל בעל החשבון" value={file.ownerEmail} ltr />
              <Row label="טלפון" value={business.phone} ltr />
              <Row label="פריט רישוי" value={business.serial_number} />
              <Row label="תפוסה מקסימלית" value={business.max_capacity?.toString() ?? null} />
              <Row label="מספר עובדים" value={business.employee_count?.toString() ?? null} />
              <Row label="משרד מקושר" value={file.partnerName} />
              <Row label="נוצר" value={formatDate(business.created_at)} />
            </dl>
          </Panel>

          <Panel icon={Coins} title="חיוב ועמלה">
            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="מחיר מנוי" value={formatShekels(billing.subscription_price)} />
              <Row label="אחוז עמלה" value={`${billing.partner_commission_rate}%`} />
              <Row label="עמלה חודשית" value={formatShekels(billing.monthly_commission)} />
              <Row
                label="דרישות פעילות"
                value={`${file.activeCount} מתוך ${file.catalogCount}`}
              />
            </dl>

            <Link
              href="/admin?tab=businesses"
              className="mt-4 block rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              לעריכת התנאים חזרו לטבלת העסקים
            </Link>
          </Panel>
        </section>

        <Panel icon={FileText} title="מסמכי הלקוח">
          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              הלקוח עדיין לא הגדיר דרישות רגולטוריות.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {doc.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {CATEGORY_LABELS[doc.category]}
                    </span>
                  </span>

                  <span className="text-xs text-gray-500">
                    {doc.document?.expiry_date
                      ? `בתוקף עד ${formatDate(doc.document.expiry_date)}`
                      : "לא הועלה מסמך"}
                  </span>

                  <StatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="min-w-0 truncate text-end text-gray-900" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}
