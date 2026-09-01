import { EXPIRING_SOON_DAYS } from "./constants";
import type { ClientDocument, DocumentStatus } from "./types";

export function computeDocumentStatus(
  expiryDate: string | null | undefined,
): DocumentStatus {
  if (!expiryDate) return "missing";

  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDate));
  if (Number.isNaN(expiry.getTime())) return "missing";

  if (expiry < today) return "expired";

  const soon = new Date(today);
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
  if (expiry < soon) return "expiring_soon";

  return "valid";
}

export function resolveCardStatus(document: ClientDocument | null): DocumentStatus {
  if (!document) return "missing";
  return computeDocumentStatus(document.expiry_date);
}

export function isActionableStatus(status: DocumentStatus): boolean {
  return status === "missing" || status === "expired" || status === "expiring_soon";
}

export function formatHebrewDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
