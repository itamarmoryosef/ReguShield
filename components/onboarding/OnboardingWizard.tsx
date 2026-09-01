"use client";

import { ArrowLeft, ArrowRight, CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { saveBusinessProfile } from "@/app/actions/business-profile";
import { setActiveTemplates } from "@/app/actions/templates";
import type { DocumentTemplate } from "@/lib/types";
import { businessProfileInputSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { AccountStep } from "./AccountStep";
import { BusinessStep } from "./BusinessStep";
import { ChecklistStep } from "./ChecklistStep";
import { PLANS, PlanStep } from "./PlanStep";
import { SuccessOverlay } from "./SuccessOverlay";
import type { FieldErrors, OnboardingData } from "./types";

const STEPS = [
  { id: 1, label: "פרטי חשבון" },
  { id: 2, label: "פרטי העסק" },
  { id: 3, label: "דרישות רגולטוריות" },
  { id: 4, label: "מסלול ותשלום" },
];

const STEP_HEADINGS: Record<number, { title: string; description: string }> = {
  1: { title: "פתיחת חשבון", description: "כמה פרטים בסיסיים כדי לשמור את ההגדרות שלכם." },
  2: {
    title: "פרטי העסק",
    description: "הפרטים ישמשו למילוי אוטומטי של טפסים רשמיים.",
  },
  3: {
    title: "אילו אישורים נדרשים לעסק?",
    description: "כבו דרישות שאינן רלוונטיות כדי לא לקבל התראות מיותרות.",
  },
  4: {
    title: "בחירת מסלול",
    description: "אפשר לשנות או לבטל מסלול בכל שלב.",
  },
};

const accountSchema = z.object({
  email: z.string().trim().email("כתובת דוא״ל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

const paymentSchema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine((value) => /^\d{16}$/.test(value), "מספר הכרטיס חייב להכיל 16 ספרות"),
  cardExpiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "תוקף בפורמט MM/YY"),
  cardCvc: z.string().regex(/^\d{3,4}$/, "CVC חייב להכיל 3 או 4 ספרות"),
  cardHolder: z.string().trim().min(2, "יש למלא את שם בעל הכרטיס"),
});

type OnboardingWizardProps = {
  templates: DocumentTemplate[];
  businessId: string | null;
};

export function OnboardingWizard({ templates, businessId }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    email: "",
    password: "",
    name: "",
    hp_number: "",
    address: "",
    owner_name: "",
    phone: "",
    serial_number: "",
    business_description: "",
    total_area: "",
    built_area: "",
    licensing_item: "4.2a",
    max_capacity: "",
    sells_alcohol: false,
    templateIds: templates.filter((template) => template.is_default_active).map((t) => t.id),
    planId: "pro",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    cardHolder: "",
  });

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(target: number): boolean {
    const collected: FieldErrors = {};

    if (target === 1) {
      const parsed = accountSchema.safeParse(data);
      if (!parsed.success) collectIssues(parsed.error, collected);
    }

    if (target === 2) {
      const parsed = businessProfileInputSchema.safeParse(data);
      if (!parsed.success) collectIssues(parsed.error, collected);
    }

    if (target === 3 && data.templateIds.length === 0) {
      collected.templateIds = "בחרו לפחות דרישה אחת כדי להמשיך";
    }

    if (target === 4) {
      const parsed = paymentSchema.safeParse(data);
      if (!parsed.success) collectIssues(parsed.error, collected);
    }

    setErrors(collected);
    return Object.keys(collected).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  }

  function back() {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function pay() {
    if (!validateStep(4)) return;

    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Demo mode persists to cookies, so the dashboard reflects these answers.
    try {
      const profile = businessProfileInputSchema.safeParse({
        ...data,
        // The account e-mail from step 1 doubles as the business contact.
        email: data.email,
        // Collected later, on the profile page.
        file_number: "",
        employee_count: "",
        professional_approvals: [],
      });

      if (profile.success) await saveBusinessProfile(profile.data);
      if (businessId) {
        await setActiveTemplates({ businessId, templateIds: data.templateIds });
      }
    } catch {
      // The mock checkout should still succeed without a backend.
    }

    setSuccess(true);
    setTimeout(() => router.push("/business"), 1900);
  }

  const heading = STEP_HEADINGS[step];
  const plan = PLANS.find((item) => item.id === data.planId) ?? PLANS[0];

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6">
        <StepIndicator steps={STEPS} current={step} />

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div key={step} className="animate-fade-in-up">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{heading.title}</h1>
            <p className="mb-6 mt-1 text-sm leading-relaxed text-gray-500">
              {heading.description}
            </p>

            {step === 1 ? (
              <AccountStep data={data} errors={errors} update={update} disabled={processing} />
            ) : null}
            {step === 2 ? (
              <BusinessStep data={data} errors={errors} update={update} disabled={processing} />
            ) : null}
            {step === 3 ? (
              <ChecklistStep
                templates={templates}
                data={data}
                errors={errors}
                update={update}
                disabled={processing}
              />
            ) : null}
            {step === 4 ? (
              <PlanStep data={data} errors={errors} update={update} disabled={processing} />
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-5">
            {step > 1 ? (
              <Button size="md" variant="ghost" onClick={back} disabled={processing}>
                <ArrowRight className="h-4 w-4" />
                חזרה
              </Button>
            ) : null}

            {step < STEPS.length ? (
              <Button size="md" variant="primary" onClick={next} className="flex-1">
                המשך
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="md"
                variant="primary"
                onClick={pay}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {processing ? "מעבד תשלום..." : `שלם ₪${plan.price} והתחל להשתמש`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {success ? <SuccessOverlay planName={plan.name} /> : null}
    </>
  );
}

function collectIssues(error: z.ZodError, target: FieldErrors) {
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof OnboardingData | undefined;
    if (key && !target[key]) target[key] = issue.message;
  }
}
