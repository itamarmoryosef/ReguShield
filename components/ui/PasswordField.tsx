"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { fieldInputClass } from "@/components/ui/TextField";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

/**
 * Password input with a reveal toggle.
 *
 * Built as its own markup rather than through TextField's suffix slot: that
 * component wraps everything in a <label>, and a button nested inside a label
 * both gets swallowed by the label's click target and ends up read out as part
 * of the field's accessible name.
 */
export function PasswordField({
  label,
  hint,
  error,
  wrapperClassName = "",
  className = "",
  disabled,
  ...props
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = `${id}-description`;

  return (
    <div className={`block ${wrapperClassName}`}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ?? hint ? describedBy : undefined}
          className={`${fieldInputClass({ error, hasSuffix: true })} ${className}`}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          // Announced rather than shown, so the icon alone carries the visual.
          aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 end-1.5 my-auto flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error ?? hint ? (
        <span
          id={describedBy}
          className={`mt-1 block text-xs ${error ? "text-red-600" : "text-gray-500"}`}
        >
          {error ?? hint}
        </span>
      ) : null}
    </div>
  );
}
