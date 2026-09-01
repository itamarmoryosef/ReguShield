export type AdminTab = "users" | "businesses" | "affiliates";

/**
 * Kept out of the "use client" component on purpose: every export of a client
 * module becomes a client reference, so calling this during server rendering
 * would fail at runtime even though the build succeeds.
 */
export function parseAdminTab(value: string | undefined): AdminTab {
  return value === "businesses" || value === "affiliates" ? value : "users";
}
