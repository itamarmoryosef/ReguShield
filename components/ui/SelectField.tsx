import type { SelectHTMLAttributes } from "react";

type Option = { value: string; label: string };

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function SelectField({
  label,
  options,
  hint,
  error,
  wrapperClassName = "",
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <select
        {...props}
        className={`h-10 w-full appearance-none rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/10"
        } ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ?? hint ? (
        <span className={`mt-1 block text-xs ${error ? "text-red-600" : "text-gray-500"}`}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
