import type { InputHTMLAttributes, ReactNode } from "react";

/** Shared so fields built outside this component cannot drift from it. */
export function fieldInputClass(options: { error?: string; hasSuffix?: boolean } = {}): string {
  return `h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500 ${
    options.error
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
      : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/10"
  } ${options.hasSuffix ? "pe-10" : ""}`;
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  suffix?: ReactNode;
  wrapperClassName?: string;
};

export function TextField({
  label,
  hint,
  error,
  suffix,
  wrapperClassName = "",
  className = "",
  ...props
}: TextFieldProps) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <span className="relative block">
        <input
          {...props}
          className={`${fieldInputClass({ error, hasSuffix: Boolean(suffix) })} ${className}`}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-gray-400">
            {suffix}
          </span>
        ) : null}
      </span>
      {error ?? hint ? (
        <span className={`mt-1 block text-xs ${error ? "text-red-600" : "text-gray-500"}`}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
