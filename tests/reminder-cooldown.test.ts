import { afterEach, describe, expect, it, vi } from "vitest";
import { cooldownDays } from "@/lib/jobs/reminders";

/**
 * The cron runs daily. Without a cooldown, a document that stays expired for a
 * month produces a month of identical emails — which is how a reminder system
 * turns into spam and gets the sending domain reported.
 */

const document = (over: { status?: string; expiry_date?: string | null } = {}) =>
  ({
    id: "11111111-1111-1111-1111-111111111111",
    business_id: "22222222-2222-2222-2222-222222222222",
    template_id: "33333333-3333-3333-3333-333333333333",
    expiry_date: null,
    status: "expired",
    ...over,
  }) as Parameters<typeof cooldownDays>[0];

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("cooldownDays", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("nudges weekly about something already lapsed", () => {
    expect(cooldownDays(document({ status: "expired", expiry_date: daysFromNow(-30) }))).toBe(7);
  });

  it("nudges weekly when the deadline is inside a week", () => {
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(3) }))).toBe(7);
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(7) }))).toBe(7);
  });

  it("eases off to a fortnight within the month", () => {
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(20) }))).toBe(14);
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(30) }))).toBe(14);
  });

  it("mentions a distant deadline monthly", () => {
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(45) }))).toBe(30);
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: daysFromNow(60) }))).toBe(30);
  });

  // A document with no date cannot be graded, and treating it as distant would
  // bury the very case that needs attention.
  it("falls back to the shortest interval when the date is unusable", () => {
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: null }))).toBe(7);
    expect(cooldownDays(document({ status: "expiring_soon", expiry_date: "not-a-date" }))).toBe(7);
  });
});
