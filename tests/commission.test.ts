import { describe, expect, it } from "vitest";
import { monthlyCommission, totalCommission } from "@/lib/commission";

/**
 * This is money owed to partners. The function deliberately mirrors a generated
 * column in Postgres, so the risk is drift: the preview an admin sees while
 * typing must match the number the database stores when they save.
 */
describe("monthlyCommission", () => {
  it("takes the percentage", () => {
    expect(monthlyCommission(1000, 15)).toBe(150);
    expect(monthlyCommission(499, 10)).toBe(49.9);
  });

  it("rounds to agorot, the way the database column does", () => {
    expect(monthlyCommission(333, 15)).toBe(49.95);
    expect(monthlyCommission(101, 12.5)).toBe(12.63);
  });

  it("returns zero rather than NaN at the edges", () => {
    expect(monthlyCommission(0, 15)).toBe(0);
    expect(monthlyCommission(1000, 0)).toBe(0);
  });

  it("passes the whole price through at a hundred percent", () => {
    expect(monthlyCommission(1000, 100)).toBe(1000);
  });
});

describe("totalCommission", () => {
  it("sums an empty payout to zero", () => {
    expect(totalCommission([])).toBe(0);
  });

  // Summing floats directly gives 0.30000000000000004, which shows up in a
  // payout screen as a number nobody can reconcile.
  it("adds rounded per-client amounts without float drift", () => {
    expect(totalCommission([{ monthly_commission: 0.1 }, { monthly_commission: 0.2 }])).toBe(0.3);
    expect(
      totalCommission([
        { monthly_commission: 49.95 },
        { monthly_commission: 12.63 },
        { monthly_commission: 150 },
      ]),
    ).toBe(212.58);
  });
});
