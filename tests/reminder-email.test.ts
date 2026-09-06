import { describe, expect, it } from "vitest";
import { renderReminderEmail, type ReminderDocument, type ReminderRecipient } from "@/lib/jobs/delivery";

const recipient: ReminderRecipient = {
  email: "owner@example.co.il",
  businessName: "מסעדת הגן",
  ownerName: "דנה לוי",
  brandName: null,
  customText: null,
};

const expired: ReminderDocument = {
  templateName: "אישור כשרות",
  category: "בריאות",
  expiryDate: "2026-01-01",
  status: "expired",
};

const soon: ReminderDocument = {
  templateName: "יומן הדברה",
  category: "בריאות",
  expiryDate: "2099-01-01",
  status: "expiring_soon",
};

describe("renderReminderEmail", () => {
  // Gmail rendered an earlier template as a blank message because it was a
  // styled div rather than a document. The shape is the fix, so it is asserted.
  it("produces a full HTML document with a declared charset", () => {
    const { html } = renderReminderEmail(recipient, [expired]);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("<table");
  });

  it("names the business in the subject", () => {
    expect(renderReminderEmail(recipient, [expired]).subject).toContain("מסעדת הגן");
  });

  it("leads with expiry when something has already lapsed", () => {
    expect(renderReminderEmail(recipient, [expired, soon]).subject).toContain("פג תוקפו");
    expect(renderReminderEmail(recipient, [soon]).subject).toContain("פקיעה");
  });

  // "1 מסמכים שפג תוקפם" is broken Hebrew, and the subject line is the one
  // part of the message every recipient reads.
  it("inflects the subject for a single document", () => {
    expect(renderReminderEmail(recipient, [expired]).subject).toContain("מסמך אחד שפג תוקפו");
    expect(renderReminderEmail(recipient, [soon]).subject).toContain("מסמך אחד לקראת פקיעה");
  });

  it("counts the documents when there is more than one", () => {
    const two = renderReminderEmail(recipient, [expired, { ...expired, templateName: "רישיון" }]);
    expect(two.subject).toContain("2 מסמכים שפג תוקפם");
    expect(renderReminderEmail(recipient, [soon, { ...soon, templateName: "אחר" }]).subject).toContain(
      "2 מסמכים לקראת פקיעה",
    );
  });

  it("lists every document in both the HTML and the plain text part", () => {
    const { html, text } = renderReminderEmail(recipient, [expired, soon]);
    for (const document of [expired, soon]) {
      expect(html).toContain(document.templateName);
      expect(text).toContain(document.templateName);
    }
  });

  it("signs with the partner brand instead of ours when there is one", () => {
    const branded = renderReminderEmail({ ...recipient, brandName: "רגולציה ושותפים" }, [expired]);
    expect(branded.html).toContain("רגולציה ושותפים");
    expect(branded.html).not.toContain("ReguShield");
  });

  it("uses the partner's own wording when they set it", () => {
    const custom = renderReminderEmail({ ...recipient, customText: "צוות המשרד יטפל בחידוש" }, [expired]);
    expect(custom.html).toContain("צוות המשרד יטפל בחידוש");
    expect(custom.text).toContain("צוות המשרד יטפל בחידוש");
  });

  // Business and partner names are user input that lands in an email body, so
  // a name containing markup must not become markup.
  it("escapes names instead of trusting them", () => {
    const hostile = renderReminderEmail(
      { ...recipient, businessName: '<script>alert("x")</script>' },
      [expired],
    );
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).toContain("&lt;script&gt;");
  });

  it("still renders when the optional fields are absent", () => {
    const bare = renderReminderEmail(
      { ...recipient, ownerName: null },
      [{ templateName: "רישיון עסק", category: null, expiryDate: null, status: "expired" }],
    );
    expect(bare.html).toContain("רישיון עסק");
    expect(bare.html).not.toContain("Invalid Date");
    expect(bare.html).not.toContain("null");
  });

  it("offers the dashboard link as text too, for clients that strip buttons", () => {
    const { html, text } = renderReminderEmail(recipient, [expired]);
    const link = html.match(/href="([^"]+)"/)?.[1];
    expect(link).toBeTruthy();
    expect(text).toContain(link!);
  });
});
