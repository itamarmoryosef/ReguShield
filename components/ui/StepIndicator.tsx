import { Check } from "lucide-react";

type StepIndicatorProps = {
  steps: { id: number; label: string }[];
  current: number;
};

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  const progress = ((current - 1) / (steps.length - 1)) * 100;

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-x-0 top-4 h-0.5 bg-gray-200" />
        <div
          className="absolute top-4 h-0.5 bg-brand-600 transition-all duration-500"
          style={{ width: `${progress}%`, right: 0 }}
        />
        <ol className="relative flex items-start justify-between">
          {steps.map((step) => {
            const done = step.id < current;
            const active = step.id === current;
            return (
              <li key={step.id} className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    done
                      ? "border-brand-600 bg-brand-600 text-white"
                      : active
                        ? "border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100"
                        : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : step.id}
                </span>
                <span
                  className={`hidden max-w-[7rem] text-center text-[11px] leading-tight sm:block ${
                    active ? "font-semibold text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-4 text-center text-xs text-gray-500 sm:hidden">
        שלב {current} מתוך {steps.length} · {steps[current - 1]?.label}
      </p>
    </div>
  );
}
