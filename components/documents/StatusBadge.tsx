import { STATUS_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/lib/types";

const BADGE_STYLES: Record<DocumentStatus, string> = {
  valid: "bg-emerald-600 text-white",
  expiring_soon: "bg-amber-500 text-white",
  expired: "bg-red-600 text-white",
  missing: "bg-red-600 text-white",
};

export const STATUS_TEXT_STYLES: Record<DocumentStatus, string> = {
  valid: "text-gray-500",
  expiring_soon: "text-amber-600",
  expired: "text-red-600",
  missing: "text-red-600",
};

export const STATUS_DOT_STYLES: Record<DocumentStatus, string> = {
  valid: "bg-emerald-500",
  expiring_soon: "bg-amber-500",
  expired: "bg-red-500",
  missing: "bg-red-500",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ${BADGE_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {STATUS_LABELS[status]}
    </span>
  );
}
