"use client";

import { Wand2 } from "lucide-react";
import { LICENSING_ITEM_LABELS } from "@/lib/police";
import type { LicensingItem } from "@/lib/types";
import { SelectField } from "@/components/ui/SelectField";
import { Switch } from "@/components/ui/Switch";
import { TextField } from "@/components/ui/TextField";
import type { OnboardingData, StepProps } from "./types";

const LICENSING_OPTIONS = (Object.keys(LICENSING_ITEM_LABELS) as LicensingItem[]).map((value) => ({
  value,
  label: LICENSING_ITEM_LABELS[value],
}));

export function BusinessStep({ data, errors, update, disabled }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="שם העסק"
          value={data.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="מסעדת הים התיכון"
          error={errors.name}
          disabled={disabled}
        />
        <TextField
          label="ח.פ / עוסק מורשה"
          value={data.hp_number}
          onChange={(event) => update("hp_number", event.target.value)}
          placeholder="514000001"
          inputMode="numeric"
          error={errors.hp_number}
          disabled={disabled}
        />
      </div>

      <TextField
        label="כתובת מלאה"
        value={data.address}
        onChange={(event) => update("address", event.target.value)}
        placeholder="דיזנגוף 101, תל אביב"
        error={errors.address}
        disabled={disabled}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="שם הבעלים"
          value={data.owner_name}
          onChange={(event) => update("owner_name", event.target.value)}
          placeholder="ישראל ישראלי"
          error={errors.owner_name}
          disabled={disabled}
        />
        <TextField
          label="טלפון"
          value={data.phone}
          onChange={(event) => update("phone", event.target.value)}
          placeholder="03-1234567"
          inputMode="tel"
          error={errors.phone}
          disabled={disabled}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <p className="mb-3 text-xs font-medium text-gray-700">
          פרטי הרישוי - כלשונם בצו רישוי עסקים
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="מספר סידורי לפי צו רישוי עסקים"
              value={data.serial_number}
              onChange={(event) => update("serial_number", event.target.value)}
              placeholder="4.2 א"
              error={errors.serial_number}
              disabled={disabled}
            />
            <TextField
              label="תיאור העיסוק לפי הצו"
              value={data.business_description}
              onChange={(event) => update("business_description", event.target.value)}
              placeholder="מסעדה - הכנה והגשה של מזון"
              error={errors.business_description}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="שטח העסק במ״ר"
              value={data.total_area}
              onChange={(event) => update("total_area", event.target.value)}
              placeholder="180"
              inputMode="decimal"
              error={errors.total_area}
              disabled={disabled}
            />
            <TextField
              label="השטח הבנוי במ״ר"
              value={data.built_area}
              onChange={(event) => update("built_area", event.target.value)}
              placeholder="120"
              inputMode="decimal"
              error={errors.built_area}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="פריט רישוי"
              value={data.licensing_item}
              onChange={(event) =>
                update("licensing_item", event.target.value as OnboardingData["licensing_item"])
              }
              options={LICENSING_OPTIONS}
              disabled={disabled}
            />
            <TextField
              label="קיבולת קהל מקסימלית"
              value={data.max_capacity}
              onChange={(event) => update("max_capacity", event.target.value)}
              placeholder="120"
              inputMode="numeric"
              error={errors.max_capacity}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
            <p className="text-sm text-gray-700">העסק מוכר או מגיש אלכוהול</p>
            <Switch
              checked={data.sells_alcohol}
              onChange={(checked) => update("sells_alcohol", checked)}
              disabled={disabled}
              label="העסק מוכר או מגיש אלכוהול"
            />
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-brand-900">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        הפרטים האלה ימולאו אוטומטית בטפסים רשמיים, כמו תצהיר בטיחות אש ובקשות לרשות המקומית.
      </p>
    </div>
  );
}
