"use client";

import { Briefcase, Store } from "lucide-react";
import type { UserRole } from "@/lib/types";

const OPTIONS: { value: UserRole; label: string; hint: string; icon: typeof Store }[] = [
  { value: "business", label: "בעל עסק", hint: "מסעדה, בית קפה, קייטרינג", icon: Store },
  { value: "partner", label: "שותף", hint: "משרד ייעוץ ורישוי", icon: Briefcase },
];

type RoleToggleProps = {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
};

export function RoleToggle({ value, onChange, disabled }: RoleToggleProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">סוג החשבון</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="סוג החשבון">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-xl border p-3 text-right transition-all disabled:opacity-60 ${
                selected
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${selected ? "text-brand-600" : "text-gray-400"}`}
              />
              <span
                className={`mt-2 block text-sm font-medium ${
                  selected ? "text-brand-900" : "text-gray-900"
                }`}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
      <input type="hidden" name="role" value={value} />
    </div>
  );
}
