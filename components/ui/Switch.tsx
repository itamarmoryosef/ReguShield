"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
};

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 ${
        checked ? "bg-brand-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          checked ? "end-0.5" : "start-0.5"
        }`}
      />
    </button>
  );
}
