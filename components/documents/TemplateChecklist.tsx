"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setActiveTemplates } from "@/app/actions/templates";
import { CATEGORY_LABELS } from "@/lib/constants";
import { toUserMessage } from "@/lib/errors";
import type { ChecklistTemplate, DocumentCategory } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Toast } from "@/components/ui/Toast";

const CATEGORY_ORDER: DocumentCategory[] = ["Fire", "Health", "Municipality"];

type TemplateChecklistProps = {
  businessId: string;
  templates: ChecklistTemplate[];
};

export function TemplateChecklist({ businessId, templates }: TemplateChecklistProps) {
  const router = useRouter();
  const initialActive = useMemo(
    () => templates.filter((template) => template.active).map((template) => template.id),
    [templates],
  );

  const [activeIds, setActiveIds] = useState<string[]>(initialActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => {
    if (activeIds.length !== initialActive.length) return true;
    const current = new Set(activeIds);
    return initialActive.some((id) => !current.has(id));
  }, [activeIds, initialActive]);

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: templates.filter((template) => template.category === category),
      })).filter((group) => group.items.length > 0),
    [templates],
  );

  function toggle(templateId: string, next: boolean) {
    setSaved(false);
    setActiveIds((prev) =>
      next ? [...prev, templateId] : prev.filter((id) => id !== templateId),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setActiveTemplates({ businessId, templateIds: activeIds });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function resetToDefaults() {
    setSaved(false);
    setActiveIds(
      templates.filter((template) => template.is_default_active).map((template) => template.id),
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
        <p className="text-sm text-gray-600">
          סמנו רק את האישורים הרלוונטיים לעסק. דרישות שאינן מסומנות לא יופיעו בלוח הבקרה
          ולא ייצרו התראות.
        </p>
        <p className="mt-1.5 text-sm font-semibold text-gray-900">
          נבחרו {activeIds.length} מתוך {templates.length} דרישות
        </p>
      </div>

      {grouped.map((group) => (
        <section key={group.category}>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            {CATEGORY_LABELS[group.category]}
          </h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            {group.items.map((template) => (
              <div key={template.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {template.applies_to_hint ?? "דרישה רגולטורית"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {template.is_default_active ? (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        מומלץ לכל עסק
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        תלוי אופי העסק
                      </span>
                    )}
                    {template.hasDocument ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        קיים מסמך
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="pt-0.5">
                  <Switch
                    checked={activeIds.includes(template.id)}
                    onChange={(next) => toggle(template.id, next)}
                    disabled={busy}
                    label={template.name}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row">
        <Button size="md" variant="primary" onClick={save} disabled={busy || !dirty} className="flex-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמירת הדרישות
        </Button>
        <Button size="md" variant="outline" onClick={resetToDefaults} disabled={busy}>
          <RotateCcw className="h-4 w-4" />
          ברירת מחדל
        </Button>
      </div>

      <Toast
        message={saved ? "הדרישות נשמרו. לוח הבקרה עודכן." : null}
        onDismiss={() => setSaved(false)}
      />
    </div>
  );
}
