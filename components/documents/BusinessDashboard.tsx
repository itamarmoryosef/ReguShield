"use client";

import { PenLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashboardDocument, DocumentCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Toast } from "@/components/ui/Toast";
import { ComplianceSummary } from "./ComplianceSummary";
import { DocumentCard } from "./DocumentCard";
import { UploadModal } from "./UploadModal";

type BusinessDashboardProps = {
  businessId: string;
  businessName: string;
  documents: DashboardDocument[];
  totalTemplates: number;
  profileComplete: boolean;
  /** Extra warnings per requirement id, shown on the card itself. */
  warnings?: Record<string, string>;
  /** Shown when the business turns out to be exempt from a requirement. */
  exemptionNotice?: string | null;
};

const CATEGORY_ORDER: DocumentCategory[] = ["Fire", "Health", "Municipality"];

export function BusinessDashboard({
  businessId,
  businessName,
  documents,
  totalTemplates,
  profileComplete,
  warnings = {},
  exemptionNotice = null,
}: BusinessDashboardProps) {
  const [selected, setSelected] = useState<DashboardDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: documents.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [documents]);

  const autoFormCount = useMemo(
    () => documents.filter((item) => item.generator_key).length,
    [documents],
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{businessName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {documents.length} דרישות פעילות מתוך {totalTemplates} בקטלוג · מעודכן להיום
        </p>
      </header>

      {exemptionNotice ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-sm leading-relaxed text-emerald-900">{exemptionNotice}</p>
        </div>
      ) : null}

      {!profileComplete && autoFormCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-brand-900">
              השלימו את פרטי העסק כדי למלא {autoFormCount} טפסים רשמיים אוטומטית,
              ללא הקלדה חוזרת.
            </p>
          </div>
          <Link
            href="/business/profile"
            className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            השלמת פרטים
          </Link>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-gray-900">לא הוגדרו דרישות רגולטוריות</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-500">
            בחרו אילו אישורים רלוונטיים לעסק כדי להתחיל לעקוב אחריהם ולקבל התראות בזמן.
          </p>
          <Link
            href="/business/settings"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            הגדרת דרישות
          </Link>
        </div>
      ) : (
        <>
          <ComplianceSummary documents={documents} />

          <div className="space-y-8">
            {grouped.map((group) => (
              <section key={group.category}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {CATEGORY_LABELS[group.category]}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <DocumentCard
                      key={item.id}
                      item={item}
                      businessId={businessId}
                      profileComplete={profileComplete}
                      warning={warnings[item.id]}
                      onUpload={setSelected}
                      onFormGenerated={() => setToast("הטופס נוצר והורד בהצלחה")}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <UploadModal
        open={Boolean(selected)}
        item={selected}
        businessId={businessId}
        onClose={() => setSelected(null)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
