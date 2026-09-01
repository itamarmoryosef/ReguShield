/** Commission applied to a client whose terms were never set explicitly. */
export const DEFAULT_COMMISSION_RATE = 15;

/**
 * Monthly commission in shekels.
 *
 * Mirrors the generated column on business_billing on purpose. Live screens
 * read the value the database computed; this covers demo mode and the preview
 * shown while an admin is still typing, so the number never jumps once saved.
 */
export function monthlyCommission(subscriptionPrice: number, commissionRate: number): number {
  return Math.round(subscriptionPrice * commissionRate) / 100;
}

/** Sums payouts the way they are actually paid: rounded per client, then added. */
export function totalCommission(rows: { monthly_commission: number }[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.monthly_commission * 100, 0)) / 100;
}

const shekels = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatShekels(value: number): string {
  return shekels.format(value);
}
