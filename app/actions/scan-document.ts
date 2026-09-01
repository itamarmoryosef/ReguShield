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

export async function scanDocument(input: ScanDocumentInput): Promise<ScanDocumentResult> {
  try {
    const validInput = parseOrThrow(scanDocumentInputSchema, input);
    const templates = await loadTemplates();

    if (!isOpenAiConfigured()) {
      return mockScan(templates);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageUrl = validInput.fileUrl || toDataUrl(validInput.imageBase64 ?? "", validInput.mimeType);

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
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
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
