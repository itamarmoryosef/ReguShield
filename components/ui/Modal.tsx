"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  badge,
  children,
  maxWidthClassName = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClassName} rounded-t-2xl border border-gray-200 bg-white p-5 shadow-panel animate-fade-in-up sm:rounded-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {badge}
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="סגירה"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
