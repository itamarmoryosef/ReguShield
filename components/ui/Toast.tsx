"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

export type ToastTone = "success" | "error";

type ToastProps = {
  message: string | null;
  tone?: ToastTone;
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, tone = "success", onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-5 z-[60] mx-auto flex w-auto max-w-sm items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-panel animate-fade-in-up sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2"
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${tone === "success" ? "text-emerald-600" : "text-red-600"}`}
      />
      <p className="min-w-0 flex-1 text-sm text-gray-800">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="סגירת ההודעה"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
