import { describe, expect, it } from "vitest";
import { isMobile, pickWhatsAppNumber, toE164Israel } from "@/lib/jobs/channels/phone";

/**
 * A wrong number here fails quietly: WhatsApp accepts the request, the message
 * goes nowhere, and the job is recorded as sent. So the rule is that anything
 * doubtful must come back null rather than be guessed at.
 */
describe("toE164Israel", () => {
  it("accepts the national format people actually type", () => {
    expect(toE164Israel("0503781924")).toBe("972503781924");
    expect(toE164Israel("050-378-1924")).toBe("972503781924");
    expect(toE164Israel("050 378 1924")).toBe("972503781924");
  });

  it("accepts a number that is already international", () => {
    expect(toE164Israel("+972503781924")).toBe("972503781924");
    expect(toE164Israel("+972 50 378 1924")).toBe("972503781924");
    expect(toE164Israel("00972503781924")).toBe("972503781924");
    expect(toE164Israel("972503781924")).toBe("972503781924");
  });

  it("handles a landline written with brackets", () => {
    expect(toE164Israel("(03) 1234567")).toBe("97231234567");
    expect(toE164Israel("03-1234567")).toBe("97231234567");
  });

  it("returns null for nothing at all", () => {
    expect(toE164Israel(null)).toBeNull();
    expect(toE164Israel(undefined)).toBeNull();
    expect(toE164Israel("")).toBeNull();
    expect(toE164Israel("   ")).toBeNull();
    expect(toE164Israel("לא ידוע")).toBeNull();
  });

  it("refuses a number of the wrong length instead of padding it", () => {
    expect(toE164Israel("050378")).toBeNull();
    expect(toE164Israel("05037819245678")).toBeNull();
  });

  // Guessing that a foreign number is Israeli would send the reminder to a
  // stranger's phone.
  it("refuses a foreign number rather than assuming Israel", () => {
    expect(toE164Israel("+1 415 555 0123")).toBeNull();
    expect(toE164Israel("+44 20 7946 0958")).toBeNull();
  });
});

describe("isMobile", () => {
  it("recognises every Israeli mobile prefix", () => {
    for (const prefix of ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59"]) {
      expect(isMobile(`972${prefix}1234567`)).toBe(true);
    }
  });

  // A landline cannot receive WhatsApp, so sending to one reports a success
  // that never happened.
  it("rejects a landline", () => {
    expect(isMobile("97231234567")).toBe(false);
    expect(isMobile("97241234567")).toBe(false);
    expect(isMobile("97291234567")).toBe(false);
  });

  it("rejects nothing and non-Israeli numbers", () => {
    expect(isMobile(null)).toBe(false);
    expect(isMobile("14155550123")).toBe(false);
  });
});

describe("pickWhatsAppNumber", () => {
  it("prefers the first usable mobile in order", () => {
    expect(pickWhatsAppNumber(["050-378-1924", "03-1234567"])).toBe("972503781924");
  });

  it("skips a landline to reach a mobile behind it", () => {
    expect(pickWhatsAppNumber(["03-1234567", "0521112222"])).toBe("972521112222");
  });

  it("returns null when no candidate can receive a message", () => {
    expect(pickWhatsAppNumber(["03-1234567", null, "", "לא ידוע"])).toBeNull();
    expect(pickWhatsAppNumber([])).toBeNull();
  });
});
