import { CATEGORY_LABELS } from "@/lib/constants";
import { reminderFromAddress, siteUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { pickWhatsAppNumber } from "@/lib/jobs/channels/phone";
import { isWhatsAppConfigured, sendWhatsAppReminder } from "@/lib/jobs/channels/whatsapp";
import type { createServiceClient } from "@/lib/supabase/admin";

export type ReminderDocument = {
  templateName: string;
  category: string | null;
  expiryDate: string | null;
  status: string;
};

export type ReminderRecipient = {
  /** Empty when the business has no reachable address; a phone may still work. */
  email: string;
  /** E.164 mobile, when one could be trusted. See channels/phone.ts. */
  whatsAppNumber: string | null;
  businessName: string;
  ownerName: string | null;
  /** Partner branding, when the client came through an agency. */
  brandName: string | null;
  customText: string | null;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * A reminder nobody can receive is not a delivery failure worth retrying, so
 * this is separated from transport errors and ends the job for good.
 */
export class UndeliverableError extends AppError {
  constructor(message: string) {
    super(message, { code: "UNDELIVERABLE", status: 422 });
  }
}

/** Everything one email needs, gathered in as few round trips as possible. */
export async function loadReminderRecipient(
  admin: ServiceClient,
  businessId: string,
): Promise<ReminderRecipient> {
  const { data: business, error } = await admin
    .from("businesses")
    .select("id, name, email, owner_name, phone, mobile, user_id, partner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !business) {
    throw new UndeliverableError("העסק לא נמצא");
  }

  // The profile address is what the owner typed for official forms; the account
  // address is where they actually read mail. Prefer the profile, fall back.
  let email = typeof business.email === "string" ? business.email.trim() : "";
  if (!email && business.user_id) {
    const { data: account } = await admin.auth.admin.getUserById(business.user_id);
    email = account?.user?.email ?? "";
  }

  const whatsAppNumber = pickWhatsAppNumber([business.mobile, business.phone]);

  if (!email && !whatsAppNumber) {
    throw new UndeliverableError("אין כתובת דוא״ל או מספר נייד לעסק");
  }

  let brandName: string | null = null;
  let customText: string | null = null;

  if (business.partner_id) {
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("brand_name, custom_reminder_text")
      .eq("partner_id", business.partner_id)
      .eq("role", "partner")
      .maybeSingle();

    brandName = partnerProfile?.brand_name?.trim() || null;
    customText = partnerProfile?.custom_reminder_text?.trim() || null;
  }

  return {
    email,
    whatsAppNumber,
    businessName: business.name,
    ownerName: business.owner_name ?? null,
    brandName,
    customText,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "לא ידוע";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "לא ידוע" : date.toLocaleDateString("he-IL");
}

function statusLabel(status: string, expiry: string | null): string {
  if (status === "expired") return "פג תוקף";
  if (!expiry) return "חסר מסמך";

  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return "דורש טיפול";
  if (days <= 0) return "פג תוקף";
  if (days === 1) return "פג מחר";
  return `פג בעוד ${days} ימים`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Hebrew inflects the noun and the possessive with the count, so a single
// template cannot serve both: "1 מסמכים שפג תוקפם" reads as broken Hebrew in
// the one place the customer is guaranteed to look — the subject line.
function describeExpired(count: number): string {
  return count === 1 ? "מסמך אחד שפג תוקפו" : `${count} מסמכים שפג תוקפם`;
}

function describeUpcoming(count: number): string {
  return count === 1 ? "מסמך אחד לקראת פקיעה" : `${count} מסמכים לקראת פקיעה`;
}

/**
 * Builds the reminder as a full HTML document with a table layout.
 *
 * Mail clients drop styled-div markup — a plain `<div>` shell is what made an
 * earlier template render as an empty message in Gmail — so this stays in the
 * shape every transactional provider emits.
 */
export function renderReminderEmail(
  recipient: ReminderRecipient,
  documents: ReminderDocument[],
): { subject: string; html: string; text: string } {
  const sender = recipient.brandName || "ReguShield";
  const expired = documents.filter((doc) => doc.status === "expired").length;

  const subject = `${recipient.businessName}: ${
    expired > 0 ? describeExpired(expired) : describeUpcoming(documents.length)
  }`;

  const rows = documents
    .map((doc) => {
      const tone = doc.status === "expired" ? "#b91c1c" : "#b45309";
      return `
            <tr>
              <td dir="rtl" align="right" style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b">
                ${escapeHtml(doc.templateName)}
                ${doc.category ? `<div style="font-size:12px;color:#a1a1aa;padding-top:2px">${escapeHtml(doc.category)}</div>` : ""}
              </td>
              <td dir="rtl" align="left" style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${tone};white-space:nowrap">
                ${escapeHtml(statusLabel(doc.status, doc.expiryDate))}
                <div style="font-size:12px;color:#a1a1aa;padding-top:2px">${escapeHtml(formatDate(doc.expiryDate))}</div>
              </td>
            </tr>`;
    })
    .join("");

  const intro = recipient.customText
    ? escapeHtml(recipient.customText)
    : "המסמכים הבאים דורשים טיפול כדי שהרישיון של העסק יישאר בתוקף.";

  const dashboard = `${siteUrl()}/business`;

  const html = `<!doctype html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5">
      <tr>
        <td align="center" style="padding:24px 12px">
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" style="width:540px;max-width:100%;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px">
            <tr>
              <td dir="rtl" align="right" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#18181b">
                ${escapeHtml(sender)}
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding:0 28px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#18181b">
                ${escapeHtml(recipient.businessName)}
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding:12px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#3f3f46">
                ${recipient.ownerName ? `${escapeHtml(recipient.ownerName)}, ` : ""}${intro}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0 28px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding:24px 28px">
                <a href="${dashboard}" style="background-color:#4f46e5;border-radius:8px;color:#ffffff;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:13px 28px;text-decoration:none">
                  פתיחת התיק בעסק
                </a>
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding:0 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#71717a">
                אם הכפתור לא נפתח, העתיקו את הכתובת הזאת לדפדפן:
              </td>
            </tr>
            <tr>
              <td dir="ltr" align="left" style="padding:6px 28px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#4f46e5;word-break:break-all">
                ${dashboard}
              </td>
            </tr>
            <tr>
              <td dir="rtl" align="right" style="padding:20px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#a1a1aa;border-top:1px solid #f4f4f5">
                נשלח אל ${escapeHtml(recipient.email)} מ-${escapeHtml(sender)}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    sender,
    recipient.businessName,
    "",
    recipient.customText ?? "המסמכים הבאים דורשים טיפול כדי שהרישיון של העסק יישאר בתוקף.",
    "",
    ...documents.map(
      (doc) => `- ${doc.templateName}: ${statusLabel(doc.status, doc.expiryDate)} (${formatDate(doc.expiryDate)})`,
    ),
    "",
    dashboard,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Hands the message to Resend.
 *
 * Returns the provider's message id so a job row can be traced back to a real
 * delivery rather than only claiming one happened.
 */
export async function sendReminderEmail(
  recipient: ReminderRecipient,
  documents: ReminderDocument[],
): Promise<{ providerId: string; to: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new AppError("שירות הדוא״ל אינו מוגדר", { code: "EMAIL_UNCONFIGURED", status: 503 });
  }

  const { subject, html, text } = renderReminderEmail(recipient, documents);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: reminderFromAddress(),
      to: [recipient.email],
      subject,
      html,
      text,
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    // A rejected address will be rejected again on every retry, so it is called
    // out separately from a transport hiccup that is worth trying later.
    const message = body?.message ?? `שליחת הדוא״ל נכשלה (${response.status})`;
    if (response.status === 422 || response.status === 400) {
      throw new UndeliverableError(message);
    }
    throw new AppError(message, { code: "EMAIL_SEND_FAILED", status: 502 });
  }

  return { providerId: body?.id ?? "unknown", to: recipient.email };
}

/** Maps a stored category key to the label the customer already sees in the app. */
export function categoryLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
}

export type DeliveryResult = {
  channel: "email" | "whatsapp";
  to: string;
  providerId: string;
};

/**
 * Sends the reminder over the best channel available, and says which it used.
 *
 * WhatsApp is preferred when it is switched on and the business has a mobile,
 * because a message on the phone is read and an email often is not. It stays
 * off until a Meta business account is approved, which is why email must
 * remain a complete channel rather than a placeholder.
 *
 * A WhatsApp failure falls through to email: losing the reminder entirely is
 * worse than delivering it somewhere less convenient. An `UndeliverableError`
 * does not fall through, since it means no channel can reach this business.
 */
export async function deliverReminder(
  recipient: ReminderRecipient,
  documents: ReminderDocument[],
): Promise<DeliveryResult> {
  if (isWhatsAppConfigured() && recipient.whatsAppNumber) {
    try {
      const sent = await sendWhatsAppReminder(recipient.whatsAppNumber, recipient, documents);
      return { channel: "whatsapp", to: sent.to, providerId: sent.providerId };
    } catch (error) {
      if (!recipient.email) throw error;
      // Swallowed on purpose: the job row records the channel that worked, and
      // the email attempt below reports its own failure if it also fails.
    }
  }

  if (!recipient.email) {
    throw new UndeliverableError("אין כתובת דוא״ל לעסק");
  }

  const sent = await sendReminderEmail(recipient, documents);
  return { channel: "email", to: sent.to, providerId: sent.providerId };
}
