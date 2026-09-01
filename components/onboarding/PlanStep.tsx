"use client";

import { Check, CreditCard, Lock } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import type { PlanId, StepProps } from "./types";

export const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  recommended?: boolean;
}[] = [
  {
    id: "basic",
    name: "מסלול בסיסי",
    price: 150,
    tagline: "לעסק בודד שרוצה סדר",
    features: ["עד 15 דרישות פעילות", "סריקת מסמכים ב-AI", "התראות בוואטסאפ"],
  },
  {
    id: "pro",
    name: "מסלול Pro",
    price: 290,
    tagline: "לעסק עם רגולציה מורכבת",
    features: [
      "דרישות ללא הגבלה",
      "מילוי טפסים אוטומטי",
      "ריבוי סניפים ומשתמשים",
      "תמיכה בעדיפות גבוהה",
    ],
    recommended: true,
  },
];

export function PlanStep({ data, errors, update, disabled }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const selected = data.planId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              disabled={disabled}
              onClick={() => update("planId", plan.id)}
              className={`relative rounded-xl border p-4 text-right transition-all disabled:opacity-60 ${
                selected
                  ? "border-brand-600 bg-brand-50/60 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-2.5 start-4 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  הפופולרי
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500">{plan.tagline}</p>
                </div>
                <span
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                    selected ? "border-brand-600 bg-brand-600" : "border-gray-300 bg-white"
                  }`}
                >
                  {selected ? <Check className="h-3 w-3 text-white" /> : null}
                </span>
              </div>

              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-gray-900">
                  ₪{plan.price}
                </span>
                <span className="text-xs text-gray-500">/ לחודש</span>
              </p>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <CreditCard className="h-4 w-4 text-gray-400" />
            פרטי כרטיס אשראי
          </p>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Lock className="h-3 w-3" />
            תשלום מאובטח
          </span>
        </div>

        <div className="space-y-4">
          <TextField
            label="מספר כרטיס"
            value={data.cardNumber}
            onChange={(event) => update("cardNumber", formatCardNumber(event.target.value))}
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            dir="ltr"
            className="text-left tracking-[0.12em]"
            error={errors.cardNumber}
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="תוקף"
              value={data.cardExpiry}
              onChange={(event) => update("cardExpiry", formatExpiry(event.target.value))}
              placeholder="12/28"
              inputMode="numeric"
              dir="ltr"
              className="text-left"
              error={errors.cardExpiry}
              disabled={disabled}
            />
            <TextField
              label="CVC"
              value={data.cardCvc}
              onChange={(event) =>
                update("cardCvc", event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="123"
              inputMode="numeric"
              dir="ltr"
              className="text-left"
              error={errors.cardCvc}
              disabled={disabled}
            />
          </div>
          <TextField
            label="שם בעל הכרטיס"
            value={data.cardHolder}
            onChange={(event) => update("cardHolder", event.target.value)}
            placeholder="ISRAEL ISRAELI"
            error={errors.cardHolder}
            disabled={disabled}
          />
        </div>

        <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] leading-relaxed text-gray-500">
          זהו מסך הדגמה - לא מתבצעת חיוב אמיתי ואין שמירה של פרטי הכרטיס. החיבור לספק
          התשלומים יתבצע בשלב הבא של הפיתוח.
        </p>
      </div>
    </div>
  );
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
