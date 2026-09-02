"use client";

import { ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import type { StepProps } from "./types";

export function AccountStep({ data, errors, update, disabled }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField
        label="דוא״ל"
        type="email"
        value={data.email}
        onChange={(event) => update("email", event.target.value)}
        placeholder="owner@restaurant.co.il"
        autoComplete="email"
        error={errors.email}
        disabled={disabled}
      />
      <PasswordField
        label="סיסמה"
        value={data.password}
        onChange={(event) => update("password", event.target.value)}
        placeholder="לפחות 6 תווים"
        autoComplete="new-password"
        error={errors.password}
        hint="הסיסמה תשמש לכניסה ללוח הבקרה"
        disabled={disabled}
      />
      <p className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        הפרטים נשמרים בחשבון מאובטח. לא נשלח דואר שיווקי ואפשר לבטל בכל שלב.
      </p>
    </div>
  );
}
