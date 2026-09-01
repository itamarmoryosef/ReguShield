import type { TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  wrapperClassName = "",
  className = "",
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        {...props}
        rows={rows}
        className={`block w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/10"
        } ${className}`}
      />
      {error ?? hint ? (
        <span className={`mt-1 block text-xs ${error ? "text-red-600" : "text-gray-500"}`}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
