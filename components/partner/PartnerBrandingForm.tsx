"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { updatePartnerBranding } from "@/app/actions/partner";
import { LogoUploadField } from "@/components/partner/LogoUploadField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { Toast, type ToastTone } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import type { PartnerBrandingInput } from "@/lib/types";
import { firstZodMessage } from "@/lib/validation/parse";
import { partnerBrandingInputSchema } from "@/lib/validation/schemas";

const REMINDER_LIMIT = 400;

type PartnerBrandingFormProps = {
  partnerId: string;
  initial: PartnerBrandingInput;
  demo?: boolean;
};

export function PartnerBrandingForm({ partnerId, initial, demo }: PartnerBrandingFormProps) {
  const [values, setValues] = useState<PartnerBrandingInput>(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  const dirty =
    values.brand_name !== initial.brand_name ||
    values.brand_logo_url !== initial.brand_logo_url ||
    values.custom_reminder_text !== initial.custom_reminder_text;

  function update<K extends keyof PartnerBrandingInput>(key: K, value: PartnerBrandingInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = partnerBrandingInputSchema.safeParse(values);
    if (!parsed.success) {
      setToast({ message: firstZodMessage(parsed.error), tone: "error" });
      return;
    }

    setSaving(true);
    try {
      await updatePartnerBranding(parsed.data);
      setToast({
        message: demo ? "המיתוג נשמר (מצב הדגמה)" : "המיתוג נשמר בהצלחה",
        tone: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "שמירת המיתוג נכשלה",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <LogoUploadField
        partnerId={partnerId}
        value={values.brand_logo_url}
        onChange={(url) => update("brand_logo_url", url)}
        demo={demo}
        disabled={saving}
      />

      <TextField
        label="שם העסק / המותג שלך"
        value={values.brand_name}
        onChange={(event) => update("brand_name", event.target.value)}
        placeholder="רגולשילד ייעוץ ורישוי"
        hint="מופיע ללקוחות שלך במקום השם ReguShield."
        maxLength={80}
        disabled={saving}
      />

      <TextAreaField
        label="טקסט התראה מותאם אישית"
        value={values.custom_reminder_text}
        onChange={(event) => update("custom_reminder_text", event.target.value)}
        placeholder="שלום, כאן המשרד שלך. שמנו לב שאישור בעסק עומד לפוג — נשמח לטפל בזה יחד."
        rows={4}
        maxLength={REMINDER_LIMIT}
        hint={`נשלח בתזכורות ללקוחות במקום הנוסח הרגיל. ${values.custom_reminder_text.length}/${REMINDER_LIMIT}`}
        disabled={saving}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" size="md" variant="primary" disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "שומר..." : "שמירת המיתוג"}
        </Button>
        {dirty && !saving ? <span className="text-xs text-gray-500">יש שינויים שלא נשמרו</span> : null}
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </form>
  );
}
