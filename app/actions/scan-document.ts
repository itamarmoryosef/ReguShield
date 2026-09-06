"use server";

import OpenAI from "openai";
import { DEMO_TEMPLATES } from "@/lib/demo-data";
import { AppError, toUserMessage } from "@/lib/errors";
import { isDemoMode, isOpenAiConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTemplate, ScanDocumentResult } from "@/lib/types";
import { parseJsonObject, parseOrThrow } from "@/lib/validation/parse";
import {
  documentTemplateSchema,
  openaiScanPayloadSchema,
  scanDocumentInputSchema,
  scanDocumentResultSchema,
  type ScanDocumentInput,
} from "@/lib/validation/schemas";

const SYSTEM_PROMPT = `אתה עוזר רגולטורי ישראלי מומחה למסעדות ולעסקי מזון.
תפקידך לקרוא מסמך בעברית (או דו-לשוני) ולזהות לאיזה סוג אישור/רישיון הוא שייך מתוך קטלוג התבניות שסופק, ואז לחלץ תאריכים.

כללים:
- קרא את כל הטקסט במסמך, כולל חותמות, כותרות ותאריכים בעברית ובלועזית.
- זהה את התבנית המתאימה ביותר לפי השם והקטגוריה. אם אין התאמה סבירה, החזר template_id כ-null.
- חלץ issue_date (תאריך הנפקה / תאריך בדיקה / תחילת תוקף) ו-expiry_date (תאריך פקיעה / תוקף עד).
- אם מופיע רק תאריך הנפקה ותקופת תוקף בחודשים, חשב את expiry_date בהתאם ל-default_validity_months של התבנית שנבחרה.
- תאריכים חייבים להיות בפורמט ISO 8601: YYYY-MM-DD בלבד.
- אם תאריך לא נמצא או לא חד-משמעי, החזר null לאותו שדה.
- confidence הוא מספר בין 0 ל-1.
- notes קצר בעברית: מה זיהית ולמה.

החזר JSON בלבד במבנה:
{
  "template_id": string | null,
  "template_name": string | null,
  "issue_date": "YYYY-MM-DD" | null,
  "expiry_date": "YYYY-MM-DD" | null,
  "confidence": number,
  "notes": string
}`;

function normalizeScanResult(
  raw: ReturnType<typeof openaiScanPayloadSchema.parse>,
  templates: DocumentTemplate[],
): ScanDocumentResult {
  const byId = templates.find((template) => template.id === raw.template_id);
  const byName = templates.find((template) => template.name === raw.template_name);
  const matched = byId ?? byName ?? null;

  return scanDocumentResultSchema.parse({
    template_id: matched?.id ?? null,
    template_name: matched?.name ?? raw.template_name ?? null,
    issue_date: raw.issue_date ?? null,
    expiry_date: raw.expiry_date ?? null,
    confidence: raw.confidence ?? 0,
    notes: raw.notes?.trim() || "לא התקבלו הערות מהסריקה",
  });
}

function toDataUrl(imageBase64: string, mimeType?: string): string {
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
}

/** Data URLs carry their own type, which is the only one the API will trust. */
function isPdfUpload(input: ScanDocumentInput): boolean {
  if (input.imageBase64?.startsWith("data:application/pdf")) return true;
  if (input.mimeType === "application/pdf") return true;
  return Boolean(input.fileUrl && new URL(input.fileUrl).pathname.toLowerCase().endsWith(".pdf"));
}

/**
 * Builds the content part that carries the document.
 *
 * A PDF must go through the `file` part, not `image_url`: passing a PDF data
 * URL as an image made the model answer from the prompt alone, which produced
 * confident nonsense instead of an error. On the `file` part the API extracts
 * both the text layer and page images, so scanned and digital PDFs both work.
 */
function documentContentPart(
  input: ScanDocumentInput,
): OpenAI.Chat.Completions.ChatCompletionContentPart {
  if (!isPdfUpload(input)) {
    return {
      type: "image_url",
      image_url: { url: input.fileUrl || toDataUrl(input.imageBase64 ?? "", input.mimeType), detail: "high" },
    };
  }

  if (!input.imageBase64) {
    throw new AppError("כדי לסרוק PDF יש להעלות את הקובץ עצמו", {
      code: "PDF_REQUIRES_UPLOAD",
      status: 400,
    });
  }

  return {
    type: "file",
    file: {
      filename: input.fileName || "document.pdf",
      file_data: toDataUrl(input.imageBase64, "application/pdf"),
    },
  };
}

function mockScan(templates: DocumentTemplate[]): ScanDocumentResult {
  const pestControl = templates.find((template) => template.name === "יומן הדברה") ?? templates[0];
  const today = new Date();
  const issue = new Date(today);
  issue.setMonth(issue.getMonth() - 1);
  const expiry = new Date(issue);
  expiry.setMonth(expiry.getMonth() + (pestControl?.default_validity_months ?? 3));

  return scanDocumentResultSchema.parse({
    template_id: pestControl?.id ?? null,
    template_name: pestControl?.name ?? null,
    issue_date: issue.toISOString().slice(0, 10),
    expiry_date: expiry.toISOString().slice(0, 10),
    confidence: 0.42,
    notes: "מצב הדגמה: לא הוגדר מפתח OpenAI. זוהתה התאמה מדומה ליומן הדברה.",
  });
}

async function loadTemplates(): Promise<DocumentTemplate[]> {
  if (isDemoMode()) return DEMO_TEMPLATES;

  const supabase = createClient();
  const { data } = await supabase.from("document_templates").select("*");
  const parsed = documentTemplateSchema.array().safeParse(data ?? []);
  return parsed.success ? parsed.data : DEMO_TEMPLATES;
}

/**
 * Refuses anonymous scans and meters the ones it allows.
 *
 * A server action is a public HTTP endpoint. This one spends money at OpenAI on
 * every call, so without both checks anybody who found the action id could run
 * up the bill with an upload loop.
 */
async function authorizeScan(): Promise<void> {
  if (isDemoMode()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("נדרשת התחברות כדי לסרוק מסמך", { code: "SCAN_UNAUTHENTICATED", status: 401 });
  }

  const { error } = await supabase.rpc("consume_scan_quota", { p_limit: DAILY_SCAN_LIMIT });
  if (error) {
    if (error.message?.includes("quota")) {
      throw new AppError(`הגעתם למגבלת ${DAILY_SCAN_LIMIT} הסריקות להיום. נסו שוב מחר.`, {
        code: "SCAN_QUOTA_EXCEEDED",
        status: 429,
      });
    }
    throw new AppError("בדיקת מגבלת הסריקות נכשלה", { code: "SCAN_QUOTA_FAILED", status: 500 });
  }
}

/** Generous for a real business, cheap for us, ruinous for nobody. */
const DAILY_SCAN_LIMIT = 60;

export async function scanDocument(input: ScanDocumentInput): Promise<ScanDocumentResult> {
  try {
    const validInput = parseOrThrow(scanDocumentInputSchema, input);
    await authorizeScan();
    const templates = await loadTemplates();

    if (!isOpenAiConfigured()) {
      return mockScan(templates);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const documentPart = documentContentPart(validInput);

    const catalog = templates.map((template) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      default_validity_months: template.default_validity_months,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `קטלוג התבניות לזיהוי (בחר template_id אחד בלבד):\n${JSON.stringify(catalog, null, 2)}`,
            },
            documentPart,
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message.content;
    if (!text) {
      throw new AppError("הסריקה לא החזירה תוצאה", { code: "EMPTY_SCAN", status: 502 });
    }

    const parsed = parseOrThrow(
      openaiScanPayloadSchema,
      parseJsonObject(text),
      "פלט הסריקה אינו תואם את הסכימה הנדרשת",
    );

    return normalizeScanResult(parsed, templates);
  } catch (error) {
    throw new AppError(toUserMessage(error), {
      code: error instanceof AppError ? error.code : "SCAN_FAILED",
      status: error instanceof AppError ? error.status : 500,
      cause: error,
    });
  }
}
