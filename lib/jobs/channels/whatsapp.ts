import { AppError } from "@/lib/errors";
import type { ReminderDocument, ReminderRecipient } from "@/lib/jobs/delivery";

/**
 * WhatsApp Cloud API delivery.
 *
 * Dormant until a Meta business account is approved and the four variables
 * below are set. Nothing else has to change at that point — the delivery
 * orchestrator picks this channel up on its own.
 *
 * The important constraint is that a business-initiated message must use a
 * template that Meta pre-approved. Free-form text is only allowed inside the
 * 24-hour window after the customer wrote to us, which a scheduled reminder is
 * never in, so this builds a template message with positional parameters
 * rather than a sentence.
 */

const GRAPH_VERSION = "v21.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Name of the approved template, and the language it was approved in.
 *
 * Both live in configuration because the template is created in Meta's console,
 * not here, and its name is chosen there.
 */
function templateConfig(): { name: string; language: string } {
  return {
    name: process.env.WHATSAPP_TEMPLATE_NAME || "document_reminder",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "he",
  };
}

/**
 * The parameters the approved template is expected to declare, in order.
 *
 * A template body such as:
 *   "שלום {{1}}, ל{{2}} יש {{3}} מסמכים שדורשים טיפול: {{4}}"
 * receives: owner name, business name, count, and the document list.
 *
 * Meta rejects a parameter containing a newline or a tab, so the list is joined
 * with commas rather than formatted as lines.
 */
export function whatsAppTemplateParameters(
  recipient: ReminderRecipient,
  documents: ReminderDocument[],
): string[] {
  const names = documents.map((document) => document.templateName).join(", ");
  return [
    recipient.ownerName?.trim() || recipient.businessName,
    recipient.businessName,
    String(documents.length),
    names,
  ];
}

export async function sendWhatsAppReminder(
  to: string,
  recipient: ReminderRecipient,
  documents: ReminderDocument[],
): Promise<{ providerId: string; to: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new AppError("ואטסאפ אינו מוגדר", { code: "WHATSAPP_UNCONFIGURED", status: 503 });
  }

  const template = templateConfig();

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [
            {
              type: "body",
              parameters: whatsAppTemplateParameters(recipient, documents).map((text) => ({
                type: "text",
                text,
              })),
            },
          ],
        },
      }),
    },
  );

  const body = (await response.json().catch(() => null)) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  } | null;

  if (!response.ok) {
    const message = body?.error?.message ?? `שליחת ואטסאפ נכשלה (${response.status})`;
    throw new AppError(message, { code: "WHATSAPP_SEND_FAILED", status: 502 });
  }

  return { providerId: body?.messages?.[0]?.id ?? "unknown", to };
}
