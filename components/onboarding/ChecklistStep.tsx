"use client";

import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { DocumentCategory, DocumentTemplate } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { StepProps } from "./types";

const CATEGORY_ORDER: DocumentCategory[] = ["Fire", "Health", "Municipality"];

type ChecklistStepProps = StepProps & {
  templates: DocumentTemplate[];
};

export function ChecklistStep({
  templates,
  data,
  errors,
  update,
  disabled,
}: ChecklistStepProps) {
  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: templates.filter((template) => template.category === category),
      })).filter((group) => group.items.length > 0),
    [templates],
  );

  const selected = new Set(data.templateIds);

  function toggle(templateId: string, next: boolean) {
    update(
      "templateIds",
      next
        ? [...data.templateIds, templateId]
        : data.templateIds.filter((id) => id !== templateId),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
        <p className="text-sm text-gray-600">
          נבחרו <span className="font-semibold text-gray-900">{data.templateIds.length}</span> מתוך{" "}
          {templates.length} דרישות
        </p>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            update(
              "templateIds",
              templates.filter((template) => template.is_default_active).map((t) => t.id),
            )
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          בחירת המומלצים
        </Button>
      </div>

      {errors.templateIds ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.templateIds}
        </p>
      ) : null}

      {grouped.map((group) => (
        <section key={group.category}>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            {CATEGORY_LABELS[group.category]}
          </h3>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {group.items.map((template) => (
              <div key={template.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {template.applies_to_hint ?? "דרישה רגולטורית"}
                  </p>
                  {template.generator_key ? (
                    <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                      מילוי אוטומטי
                    </span>
                  ) : null}
                </div>
                <div className="pt-0.5">
                  <Switch
                    checked={selected.has(template.id)}
                    onChange={(next) => toggle(template.id, next)}
                    disabled={disabled}
                    label={template.name}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
