import { afterEach, describe, expect, it, vi } from "vitest";
import { isWhatsAppConfigured, whatsAppTemplateParameters } from "@/lib/jobs/channels/whatsapp";
import type { ReminderDocument, ReminderRecipient } from "@/lib/jobs/delivery";

const recipient: ReminderRecipient = {
  email: "owner@example.co.il",
  whatsAppNumber: "972503781924",
  businessName: "מסעדת הגן",
  ownerName: "דנה לוי",
  brandName: null,
  customText: null,
};

const documents: ReminderDocument[] = [
  { templateName: "אישור כשרות", category: "בריאות", expiryDate: "2026-01-01", status: "expired" },
  { templateName: "יומן הדברה", category: "בריאות", expiryDate: "2026-02-01", status: "expired" },
];

describe("isWhatsAppConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // The channel must stay dormant until the Meta account is approved, and it
  // must switch on from configuration alone, with no code change.
  it("is off until both variables are present", () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    expect(isWhatsAppConfigured()).toBe(false);

    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "token");
    expect(isWhatsAppConfigured()).toBe(false);

    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "12345");
    expect(isWhatsAppConfigured()).toBe(true);
  });
});

describe("whatsAppTemplateParameters", () => {
  it("fills the four template slots in order", () => {
    expect(whatsAppTemplateParameters(recipient, documents)).toEqual([
      "דנה לוי",
      "מסעדת הגן",
      "2",
      "אישור כשרות, יומן הדברה",
    ]);
  });

  it("addresses the business when no owner name was given", () => {
    const [greeting] = whatsAppTemplateParameters({ ...recipient, ownerName: null }, documents);
    expect(greeting).toBe("מסעדת הגן");
  });

  it("does not leave an empty greeting for a blank owner name", () => {
    const [greeting] = whatsAppTemplateParameters({ ...recipient, ownerName: "   " }, documents);
    expect(greeting).toBe("מסעדת הגן");
  });

  // Meta rejects a parameter containing a newline or a tab, which would fail
  // the whole send rather than degrade it.
  it("keeps every parameter on one line", () => {
    for (const parameter of whatsAppTemplateParameters(recipient, documents)) {
      expect(parameter).not.toMatch(/[\n\r\t]/);
      expect(parameter.length).toBeGreaterThan(0);
    }
  });
});
