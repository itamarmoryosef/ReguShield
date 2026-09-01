"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { toUserMessage } from "@/lib/errors";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

export function ErrorFallback({
  error,
  reset,
  title = "משהו השתבש",
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{toUserMessage(error)}</p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-gray-400">קוד אירוע: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            נסו שוב
          </button>
          <Link
            href="/"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
