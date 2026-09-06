import { afterEach, describe, expect, it, vi } from "vitest";
import { EXPIRING_SOON_DAYS } from "@/lib/constants";
import { computeDocumentStatus, formatHebrewDate, isActionableStatus } from "@/lib/status";

/** Builds an ISO date a fixed number of days from the frozen "today". */
function daysFromNow(days: number): string {
  const date = new Date("2026-06-15T09:00:00Z");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("computeDocumentStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function freezeToday() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T09:00:00Z"));
  }

  it("treats a missing expiry date as a missing document", () => {
    freezeToday();
    expect(computeDocumentStatus(null)).toBe("missing");
    expect(computeDocumentStatus(undefined)).toBe("missing");
    expect(computeDocumentStatus("")).toBe("missing");
  });

  it("does not mistake an unparseable date for a valid one", () => {
    freezeToday();
    expect(computeDocumentStatus("not-a-date")).toBe("missing");
  });

  // A document expiring today is still valid today, which is what the
  // authorities go by. Off by one here either alarms people a day early or,
  // worse, tells them they are covered when they are not.
  it("counts the expiry day itself as still in force", () => {
    freezeToday();
    expect(computeDocumentStatus(daysFromNow(0))).toBe("expiring_soon");
    expect(computeDocumentStatus(daysFromNow(-1))).toBe("expired");
  });

  it("opens the warning window exactly on the threshold", () => {
    freezeToday();
    expect(computeDocumentStatus(daysFromNow(EXPIRING_SOON_DAYS - 1))).toBe("expiring_soon");
    expect(computeDocumentStatus(daysFromNow(EXPIRING_SOON_DAYS))).toBe("valid");
    expect(computeDocumentStatus(daysFromNow(EXPIRING_SOON_DAYS + 1))).toBe("valid");
  });

  // The comparison runs on local midnight, so a late-evening visit must not
  // roll a document into the next bucket.
  it("ignores the time of day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T23:59:00+03:00"));
    expect(computeDocumentStatus("2026-06-15")).toBe("expiring_soon");
    expect(computeDocumentStatus("2026-06-14")).toBe("expired");
  });
});

describe("isActionableStatus", () => {
  it("flags everything except a valid document", () => {
    expect(isActionableStatus("missing")).toBe(true);
    expect(isActionableStatus("expired")).toBe(true);
    expect(isActionableStatus("expiring_soon")).toBe(true);
    expect(isActionableStatus("valid")).toBe(false);
  });
});

describe("formatHebrewDate", () => {
  it("falls back to a dash rather than printing Invalid Date", () => {
    expect(formatHebrewDate(null)).toBe("—");
    expect(formatHebrewDate("nonsense")).toBe("—");
  });

  it("formats a real date as day, month, year", () => {
    expect(formatHebrewDate("2026-03-09")).toMatch(/09.*03.*2026/);
  });
});
