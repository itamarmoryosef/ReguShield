import type { ZodType, ZodTypeDef } from "zod";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function firstZodMessage(error: ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "הנתונים שנשלחו אינם תקינים";
}

// Input is kept separate from Output so schemas with defaults or transforms
// (where the two types differ) can be parsed too.
export function parseOrThrow<Output, Input>(
  schema: ZodType<Output, ZodTypeDef, Input>,
  data: unknown,
  fallbackMessage = "הנתונים שנשלחו אינם תקינים",
): Output {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError(firstZodMessage(parsed.error) || fallbackMessage, {
      code: "VALIDATION_ERROR",
      status: 400,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export function formDataToRecord(formData: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      raw[key] = value;
    }
  });
  return raw;
}

export function parseFormData<Output, Input>(
  schema: ZodType<Output, ZodTypeDef, Input>,
  formData: FormData,
): Output {
  return parseOrThrow(schema, formDataToRecord(formData));
}

export function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("התקבלה תשובה שאינה JSON תקין", {
      code: "INVALID_JSON",
      status: 502,
    });
  }
}
