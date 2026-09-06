import { describe, expect, it } from "vitest";
import {
  reminderChannelSchema,
  reminderEnqueuePayloadSchema,
  scanDocumentInputSchema,
} from "@/lib/validation/schemas";

describe("reminderChannelSchema", () => {
  // Drifting from the Postgres enum breaks reading back the rows the app
  // itself just wrote, which is the kind of failure that only shows in prod.
  it("accepts every channel the database allows", () => {
    expect(reminderChannelSchema.safeParse("email").success).toBe(true);
    expect(reminderChannelSchema.safeParse("whatsapp").success).toBe(true);
  });

  it("rejects a channel that does not exist", () => {
    expect(reminderChannelSchema.safeParse("sms").success).toBe(false);
  });
});

describe("reminderEnqueuePayloadSchema", () => {
  // Vercel Cron sends GET with no body. Requiring an event id here meant the
  // daily run was rejected before it looked at a single document.
  it("accepts an empty payload, as the cron sends", () => {
    const parsed = reminderEnqueuePayloadSchema.safeParse({});
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.look_ahead_days).toBe(60);
  });

  it("still accepts an explicit event id and horizon", () => {
    const parsed = reminderEnqueuePayloadSchema.safeParse({ event_id: "run-1", look_ahead_days: 30 });
    expect(parsed.success && parsed.data.look_ahead_days).toBe(30);
  });

  it("refuses a horizon outside the supported range", () => {
    expect(reminderEnqueuePayloadSchema.safeParse({ look_ahead_days: 0 }).success).toBe(false);
    expect(reminderEnqueuePayloadSchema.safeParse({ look_ahead_days: 400 }).success).toBe(false);
  });
});

describe("scanDocumentInputSchema", () => {
  it("requires either a file or a link", () => {
    expect(scanDocumentInputSchema.safeParse({}).success).toBe(false);
    expect(scanDocumentInputSchema.safeParse({ imageBase64: "abc" }).success).toBe(true);
    expect(scanDocumentInputSchema.safeParse({ fileUrl: "https://example.com/a.pdf" }).success).toBe(true);
  });

  it("rejects a link that is not a URL", () => {
    expect(scanDocumentInputSchema.safeParse({ fileUrl: "not-a-url" }).success).toBe(false);
  });

  it("carries the file name through, since a PDF needs it as a type hint", () => {
    const parsed = scanDocumentInputSchema.safeParse({
      imageBase64: "data:application/pdf;base64,AAAA",
      mimeType: "application/pdf",
      fileName: "רישיון.pdf",
    });
    expect(parsed.success && parsed.data.fileName).toBe("רישיון.pdf");
  });
});
