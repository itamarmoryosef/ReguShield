"use client";

import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  Flame,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABELS, TEMPLATE_HINTS } from "@/lib/constants";
import { formatHebrewDate } from "@/lib/status";
import type { DashboardDocument, DocumentCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { GenerateFormButton } from "./GenerateFormButton";
import { STATUS_TEXT_STYLES, StatusBadge } from "./StatusBadge";
import { ViewDocumentButton } from "./ViewDocumentButton";

const CATEGORY_ICONS: Record<DocumentCategory, typeof Flame> = {
  Fire: Flame,
  Health: ShieldCheck,
  Municipality: Building2,
};

type DocumentCardProps = {
  item: DashboardDocument;
  businessId: string;
  profileComplete: boolean;
  /** A regulatory caveat that applies to this business, e.g. extra appendices. */
  warning?: string;
  onUpload: (item: DashboardDocument) => void;
  onFormGenerated?: (item: DashboardDocument) => void;
};

export function DocumentCard({
  item,
  businessId,
  profileComplete,
  warning,
  onUpload,
  onFormGenerated,
}: DocumentCardProps) {
  const [formReady, setFormReady] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const CategoryIcon = CATEGORY_ICONS[item.category];
  const hasFile = Boolean(item.document?.file_path);
  const needsAction = item.status !== "valid";
  const isAutoForm = Boolean(item.generator_key);

  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:border-gray-300 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
            <CategoryIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-gray-900">
              {item.name}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">{CATEGORY_LABELS[item.category]}</p>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
        {TEMPLATE_HINTS[item.name] ?? item.applies_to_hint ?? "דרישה רגולטורית"}
      </p>

      {isAutoForm ? (
        <p className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
          <Wand2 className="h-3 w-3" />
          מילוי אוטומטי
        </p>
      ) : null}

      {warning ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-medium leading-relaxed text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warning}</span>
        </p>
      ) : null}

      <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">תוקף עד</span>
        <span className={`text-sm font-semibold ${STATUS_TEXT_STYLES[item.status]}`}>
          {item.status === "missing" ? "לא הועלה" : formatHebrewDate(item.document?.expiry_date)}
        </span>
      </div>

      {formReady ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[11px] leading-relaxed text-emerald-800 animate-fade-in">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>חתמו על הטופס והעלו בחזרה כדי לסמן את הדרישה כבתוקף.</span>
        </p>
      ) : null}

      {formError ? (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {isAutoForm ? (
          <AutoFormActions
            item={item}
            businessId={businessId}
            profileComplete={profileComplete}
            formReady={formReady}
            onUpload={onUpload}
            onGenerated={() => {
              setFormReady(true);
              onFormGenerated?.(item);
            }}
            onError={setFormError}
          />
        ) : needsAction ? (
          <Button variant="primary" onClick={() => onUpload(item)} className="flex-1">
            <Camera className="h-3.5 w-3.5" />
            צילום / העלאה
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onUpload(item)} className="flex-1">
            <RefreshCw className="h-3.5 w-3.5" />
            החלפת מסמך
          </Button>
        )}
        {hasFile && item.document ? <ViewDocumentButton documentId={item.document.id} /> : null}
      </div>
    </article>
  );
}

function AutoFormActions({
  item,
  businessId,
  profileComplete,
  formReady,
  onUpload,
  onGenerated,
  onError,
}: {
  item: DashboardDocument;
  businessId: string;
  profileComplete: boolean;
  formReady: boolean;
  onUpload: (item: DashboardDocument) => void;
  onGenerated: () => void;
  onError: (message: string | null) => void;
}) {
  if (!profileComplete) {
    return (
      <Link
        href="/business/profile"
        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
      >
        <PenLine className="h-3.5 w-3.5" />
        השלמת פרטי העסק
      </Link>
    );
  }

  if (formReady) {
    return (
      <>
        <Button variant="primary" onClick={() => onUpload(item)} className="flex-1">
          <Upload className="h-3.5 w-3.5" />
          העלאת טופס חתום
        </Button>
        <GenerateFormButton
          businessId={businessId}
          templateId={item.id}
          label="הורדה חוזרת"
          variant="outline"
          onGenerated={onGenerated}
          onError={onError}
        />
      </>
    );
  }

  return (
    <>
      <GenerateFormButton
        businessId={businessId}
        templateId={item.id}
        label="צור טופס אוטומטי"
        className="flex-1"
        onGenerated={onGenerated}
        onError={onError}
      />
      <Button
        variant="outline"
        onClick={() => onUpload(item)}
        title="העלאת טופס חתום"
        aria-label="העלאת טופס חתום"
      >
        <Upload className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
