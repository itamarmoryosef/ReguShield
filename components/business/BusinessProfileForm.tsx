"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveBusinessProfile } from "@/app/actions/business-profile";
import { toUserMessage } from "@/lib/errors";
import type { BusinessProfileInput } from "@/lib/types";
import { businessProfileInputSchema } from "@/lib/validation/schemas";
import { LICENSING_ITEM_LABELS } from "@/lib/police";
import type {
  DeclarerRole,
  LicensingItem,
  SecurityMeasures,
  SecurityState,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { Switch } from "@/components/ui/Switch";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";

/** The plain text fields, which all render through the same input. */
type FieldKey = Exclude<
  keyof BusinessProfileInput,
  | "professional_approvals"
  | "licensing_item"
  | "max_capacity"
  | "employee_count"
  | "sells_alcohol"
  | "security_measures"
  | "security_notes"
  | "declarer_role"
>;

type Field = {
  key: FieldKey;
  label: string;
  placeholder: string;
  hint: string;
  wide?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "decimal" | "email";
  type?: string;
  dir?: "ltr" | "rtl";
};

const IDENTITY_FIELDS: Field[] = [
  {
    key: "name",
    label: "שם העסק",
    placeholder: "מסעדת הים התיכון",
    hint: "כפי שמופיע ברישיון העסק",
  },
  {
    key: "hp_number",
    label: "ח.פ / ת.ז",
    placeholder: "514000001",
    hint: "מספר החברה או ת.ז של העוסק",
    inputMode: "numeric",
  },
  {
    key: "address",
    label: "כתובת מלאה",
    placeholder: "רח׳ דיזנגוף 101, תל אביב",
    hint: "רחוב, מספר ועיר",
    wide: true,
  },
  {
    key: "owner_name",
    label: "שם בעל העסק",
    placeholder: "ישראל ישראלי",
    hint: "השם שיופיע כמצהיר על הטפסים",
  },
  {
    key: "phone",
    label: "טלפון",
    placeholder: "03-1234567",
    hint: "ליצירת קשר מטעם הרשויות",
    inputMode: "tel",
  },
  {
    key: "email",
    label: "דואר אלקטרוני",
    placeholder: "office@my-restaurant.co.il",
    hint: "מופיע בפרטי המצהיר בטפסים",
    inputMode: "email",
    type: "email",
    dir: "ltr",
  },
];

// Wording follows the "פרטי העסק" table of the official declarations, where
// these values must match the licensing decree exactly.
const DECREE_FIELDS: Field[] = [
  {
    key: "serial_number",
    label: "מספר סידורי של העסק לפי צו רישוי עסקים",
    placeholder: "4.2 א",
    hint: "המספר הסידורי בצו רישוי עסקים",
  },
  {
    key: "file_number",
    label: "מס׳ תיק רישוי (אופציונלי)",
    placeholder: "2024-1187",
    hint: "מספר התיק ברשות המקומית, מופיע בתצהיר הנגישות",
  },
  {
    key: "business_description",
    label: "תיאור העיסוק לפי צו רישוי עסקים",
    placeholder: "מסעדה - הכנה והגשה של מזון",
    hint: "כלשון הצו, לא תיאור חופשי",
  },
  {
    key: "total_area",
    label: "שטח העסק במ״ר",
    placeholder: "180",
    hint: "השטח הכולל עד גבולות העסק",
    inputMode: "decimal",
  },
  {
    key: "built_area",
    label: "השטח הבנוי בעסק במ״ר",
    placeholder: "120",
    hint: "השטח הבנוי בלבד",
    inputMode: "decimal",
  },
];

// The police appendix asks for the role holders and for the extra contact
// channels beside the landline.
const CONTACT_FIELDS: Field[] = [
  {
    key: "mobile",
    label: "טלפון נייד",
    placeholder: "052-1234567",
    hint: "מודפס בפרטי המצהיר ובנספח המשטרה",
    inputMode: "tel",
  },
  {
    key: "fax",
    label: "מספר פקס (אופציונלי)",
    placeholder: "03-1234568",
    hint: "שדה בנספח הנתונים של המשטרה",
    inputMode: "tel",
  },
  {
    key: "manager_name",
    label: "שם מנהל העסק",
    placeholder: "דנה לוי",
    hint: "אם בעל העסק הוא גם המנהל, כתבו את שמו שוב",
  },
  {
    key: "manager_phone",
    label: "טלפון מנהל העסק",
    placeholder: "052-7654321",
    hint: "מודפס בטבלת בעלי התפקידים",
    inputMode: "tel",
  },
  {
    key: "shift_manager_phone",
    label: "טלפון אחראי משמרת",
    placeholder: "053-1122334",
    hint: "הטלפון שעונה בשעות הפעילות",
    inputMode: "tel",
  },
  {
    key: "security_phone",
    label: "טלפון קב״ט / חברת אבטחה",
    placeholder: "054-9988776",
    hint: "אם אין אבטחה בעסק, השאירו ריק",
    inputMode: "tel",
  },
];

// Part C of the accessibility affidavit, which is optional by law.
const CONSULTANT_FIELDS: Field[] = [
  {
    key: "accessibility_consultant_name",
    label: "שם מורשה הנגישות",
    placeholder: "רונית ברק",
    hint: "מי שסייע בהצהרת הנגישות",
  },
  {
    key: "accessibility_consultant_id",
    label: "ת.ז של מורשה הנגישות",
    placeholder: "312456789",
    hint: "כפי שמופיע בפנקס",
    inputMode: "numeric",
  },
  {
    key: "accessibility_consultant_registry",
    label: "שם הפנקס",
    placeholder: "פנקס מורשי נגישות שירות",
    hint: "מתו״ס או שירות",
  },
  {
    key: "accessibility_consultant_registry_number",
    label: "מס׳ רישום בפנקס",
    placeholder: "1284",
    hint: "מספר הרישום אצל הרשם",
    inputMode: "numeric",
  },
];

const FIELDS = [...IDENTITY_FIELDS, ...DECREE_FIELDS, ...CONTACT_FIELDS, ...CONSULTANT_FIELDS];

const DECLARER_ROLE_OPTIONS: { value: DeclarerRole; label: string }[] = [
  { value: "owner", label: "בעל/ת העסק" },
  { value: "corporate_signatory", label: "מורשה חתימה בתאגיד שהעסק בבעלותו" },
];

/** Rows of the "אמצעי מיגון ואבטחה בעסק" table in the police appendix. */
const SECURITY_ROWS: { key: keyof SecurityMeasures; label: string; notePlaceholder: string }[] = [
  {
    key: "guards",
    label: "אבטחה פיזית וחמושה (מאבטחים / בודקים)",
    notePlaceholder: "מאבטח בסופי שבוע בלבד",
  },
  { key: "fence", label: "גדר היקפית", notePlaceholder: "גדר בחזית בלבד" },
  { key: "controlRoom", label: "מוקד בקרה", notePlaceholder: "בקרה מהמשרד" },
  {
    key: "alarm",
    label: "מערכת אזעקה וחיבור למוקד",
    notePlaceholder: "מחוברת למוקד חברת אבטחה",
  },
  {
    key: "cameras",
    label: "מצלמות / מערכת טמ״ס / כספת",
    notePlaceholder: "6 מצלמות וכספת במשרד",
  },
];

const SECURITY_OPTIONS: { value: SecurityState; label: string }[] = [
  { value: "exists", label: "קיים" },
  { value: "partial", label: "חלקי" },
  { value: "missing", label: "לא קיים" },
  { value: "unknown", label: "לא צוין" },
];

const LICENSING_OPTIONS = (Object.keys(LICENSING_ITEM_LABELS) as LicensingItem[]).map((value) => ({
  value,
  label: LICENSING_ITEM_LABELS[value],
}));

const APPROVAL_SLOTS = 4;

const APPROVAL_PLACEHOLDERS = [
  "אישור תקינות מתקן גז",
  "אישור ניקוי מנדפים",
  "אישור בדיקת מערכת חשמל",
  "אישור בדיקת מטפי כיבוי",
];

/** Always renders four rows, so the array keeps a stable shape while editing. */
function toApprovalSlots(values: string[]): string[] {
  return Array.from({ length: APPROVAL_SLOTS }, (_, index) => values[index] ?? "");
}

/** Head counts are edited as text so the field can be left empty. */
function toCountText(value: number | null): string {
  return value === null ? "" : String(value);
}

type BusinessProfileFormProps = {
  initialValues: BusinessProfileInput;
};

export function BusinessProfileForm({ initialValues }: BusinessProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BusinessProfileInput>(initialValues);
  const [approvals, setApprovals] = useState<string[]>(() =>
    toApprovalSlots(initialValues.professional_approvals),
  );
  const [counts, setCounts] = useState(() => ({
    max_capacity: toCountText(initialValues.max_capacity),
    employee_count: toCountText(initialValues.employee_count),
  }));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BusinessProfileInput, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => {
    const initialApprovals = toApprovalSlots(initialValues.professional_approvals);
    return (
      FIELDS.some((field) => values[field.key] !== initialValues[field.key]) ||
      approvals.some((value, index) => value !== initialApprovals[index]) ||
      values.licensing_item !== initialValues.licensing_item ||
      values.sells_alcohol !== initialValues.sells_alcohol ||
      values.declarer_role !== initialValues.declarer_role ||
      SECURITY_ROWS.some(
        (row) =>
          values.security_measures[row.key] !== initialValues.security_measures[row.key] ||
          values.security_notes[row.key] !== initialValues.security_notes[row.key],
      ) ||
      counts.max_capacity !== toCountText(initialValues.max_capacity) ||
      counts.employee_count !== toCountText(initialValues.employee_count)
    );
  }, [values, approvals, counts, initialValues]);

  function update(key: FieldKey, value: string) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateCount(key: "max_capacity" | "employee_count", value: string) {
    setSaved(false);
    setCounts((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateMeasure(key: keyof SecurityMeasures, state: SecurityState) {
    setSaved(false);
    setValues((prev) => ({
      ...prev,
      security_measures: { ...prev.security_measures, [key]: state },
    }));
  }

  function updateMeasureNote(key: keyof SecurityMeasures, note: string) {
    setSaved(false);
    setValues((prev) => ({
      ...prev,
      security_notes: { ...prev.security_notes, [key]: note },
    }));
    setFieldErrors((prev) => ({ ...prev, security_notes: undefined }));
  }

  function updateApproval(index: number, value: string) {
    setSaved(false);
    setApprovals((prev) => prev.map((item, position) => (position === index ? value : item)));
  }

  async function submit() {
    const parsed = businessProfileInputSchema.safeParse({
      ...values,
      professional_approvals: approvals,
      max_capacity: counts.max_capacity,
      employee_count: counts.employee_count,
    });
    if (!parsed.success) {
      const errors: Partial<Record<keyof BusinessProfileInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof BusinessProfileInput | undefined;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await saveBusinessProfile(parsed.data);
      setValues(parsed.data);
      setApprovals(toApprovalSlots(parsed.data.professional_approvals));
      setCounts({
        max_capacity: toCountText(parsed.data.max_capacity),
        employee_count: toCountText(parsed.data.employee_count),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function renderFields(fields: Field[]) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={values[field.key]}
            onChange={(event) => update(field.key, event.target.value)}
            placeholder={field.placeholder}
            inputMode={field.inputMode}
            type={field.type}
            dir={field.dir}
            disabled={busy}
            hint={field.hint}
            error={fieldErrors[field.key]}
            wrapperClassName={field.wide ? "sm:col-span-2" : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        {renderFields(IDENTITY_FIELDS)}
        <div className="mt-4">
          <SelectField
            label="מי מצהיר על הטפסים"
            value={values.declarer_role}
            onChange={(event) => {
              setSaved(false);
              setValues((prev) => ({
                ...prev,
                declarer_role: event.target.value as DeclarerRole,
              }));
            }}
            options={DECLARER_ROLE_OPTIONS}
            disabled={busy}
            hint="מסומן בתצהיר הכבאות. מורשה חתימה מדפיס גם את שם התאגיד וח.פ"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">אנשי קשר בעסק</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            נספח הנתונים של המשטרה מבקש את מי שמנהל את העסק בפועל ואת הטלפונים שעונים בשעות
            הפעילות. שדות ריקים פשוט לא יודפסו.
          </p>
        </div>
        {renderFields(CONTACT_FIELDS)}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">פרטי הרישוי</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            הפרטים האלה נדרשים בתצהיר הכבאות ובתצהיר הנגישות, ומופיעים ברישיון העסק או בצו
            רישוי עסקים.
          </p>
        </div>
        {renderFields(DECREE_FIELDS)}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">סוג העסק ודרישות המשטרה</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            פריט הרישוי, התפוסה ומכירת אלכוהול קובעים אם נדרש אישור משטרה ואיזה טופס להגיש.
            הנתונים גם מודפסים בנספח הנתונים הכלליים של המשטרה.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="פריט רישוי"
            value={values.licensing_item}
            onChange={(event) => {
              setSaved(false);
              setValues((prev) => ({
                ...prev,
                licensing_item: event.target.value as LicensingItem,
              }));
            }}
            options={LICENSING_OPTIONS}
            disabled={busy}
            hint="לפי צו רישוי עסקים"
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            label="קיבולת קהל מקסימלית"
            value={counts.max_capacity}
            onChange={(event) => updateCount("max_capacity", event.target.value)}
            placeholder="120"
            inputMode="numeric"
            disabled={busy}
            hint="מספר המקומות המותר בעסק"
            error={fieldErrors.max_capacity}
          />
          <TextField
            label="מספר עובדים"
            value={counts.employee_count}
            onChange={(event) => updateCount("employee_count", event.target.value)}
            placeholder="14"
            inputMode="numeric"
            disabled={busy}
            hint="כולל בעלי תפקידים"
            error={fieldErrors.employee_count}
          />
          <TextAreaField
            label="תיאור כללי של העסק"
            value={values.general_description}
            onChange={(event) => update("general_description", event.target.value)}
            placeholder="מסעדה בקומת קרקע עם אולם אירוח, מטבח מאחור וחצר פתוחה לרחוב."
            disabled={busy}
            hint="תיאור חופשי, בנוסף לתיאור העיסוק לפי הצו"
            error={fieldErrors.general_description}
            wrapperClassName="sm:col-span-2"
          />
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">העסק מוכר או מגיש אלכוהול</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              מסעדה או מזנון שמגישים אלכוהול נדרשים לאישור משטרה גם מתחת ל-200 מקומות.
            </p>
          </div>
          <Switch
            checked={values.sells_alcohol}
            onChange={(checked) => {
              setSaved(false);
              setValues((prev) => ({ ...prev, sells_alcohol: checked }));
            }}
            disabled={busy}
            label="העסק מוכר או מגיש אלכוהול"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">אמצעי מיגון ואבטחה בעסק</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            הטבלה הזאת מסומנת בנספח הנתונים של המשטרה. בחרו את המצב בפועל לכל אמצעי;
            &quot;לא צוין&quot; משאיר את השורה ריקה בטופס. ההערה מודפסת בעמודת
            &quot;הערות&quot; של אותה שורה, ולכן כדאי לקצר.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {SECURITY_ROWS.map((row) => (
            <div key={row.key} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-800">{row.label}</p>
                <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                  {SECURITY_OPTIONS.map((option) => {
                    const active = values.security_measures[row.key] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateMeasure(row.key, option.value)}
                        disabled={busy}
                        aria-pressed={active}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                          active
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input
                type="text"
                value={values.security_notes[row.key]}
                onChange={(event) => updateMeasureNote(row.key, event.target.value)}
                placeholder={`הערה (אופציונלי) - ${row.notePlaceholder}`}
                disabled={busy}
                maxLength={60}
                aria-label={`הערה - ${row.label}`}
                className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          ))}
        </div>
        {fieldErrors.security_notes ? (
          <p className="mt-2 text-xs text-red-600">{fieldErrors.security_notes}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            מורשה נגישות (אופציונלי)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            חלק ג׳ בתצהיר הנגישות. למלא רק אם נעזרתם במורשה נגישות מתו״ס או שירות.
          </p>
        </div>
        {renderFields(CONSULTANT_FIELDS)}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            אישורים מאנשי מקצוע (לסעיף 7 בתצהיר)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            נושאים שאינם בתחום מומחיותכם, שההצהרה עליהם נסמכת על אישור של איש מקצוע.
            עד ארבעה אישורים, ואת האישורים עצמם יש לצרף לתצהיר החתום.
          </p>
        </div>

        <div className="space-y-3">
          {approvals.map((value, index) => (
            <TextField
              key={index}
              label={`אישור ${index + 1}`}
              value={value}
              onChange={(event) => updateApproval(index, event.target.value)}
              placeholder={APPROVAL_PLACEHOLDERS[index]}
              disabled={busy}
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="md"
          variant="primary"
          onClick={submit}
          disabled={busy || !dirty}
          className="flex-1"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמירת פרטי העסק
        </Button>
      </div>

      <Toast
        message={saved ? "פרטי העסק נשמרו וישמשו למילוי אוטומטי של טפסים" : null}
        onDismiss={() => setSaved(false)}
      />
    </div>
  );
}
