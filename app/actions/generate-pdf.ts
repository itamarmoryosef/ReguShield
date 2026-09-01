"use server";

import { parseBusinessProfile, toFormBusinessDetails } from "@/lib/business-profile";
import { getCurrentBusiness, getTemplates } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { getFormDefinition } from "@/lib/forms/definitions";
import { buildAutoFilledForm, buildFormFileName } from "@/lib/pdf/generate-form";
import { resolveGeneratorKey } from "@/lib/police";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  generateFormInputSchema,
  type GenerateFormInput,
  type GeneratedForm,
} from "@/lib/validation/schemas";

export async function generateFormPdf(input: GenerateFormInput): Promise<GeneratedForm> {
  try {
    const { businessId, templateId } = parseOrThrow(generateFormInputSchema, input);

    const business = await getCurrentBusiness();
    if (!business) {
      throw new AppError("לא נמצא עסק מקושר לחשבון", {
        code: "BUSINESS_NOT_FOUND",
        status: 404,
      });
    }

    // The signed-in business is the source of truth; the client-supplied id is
    // only accepted when it matches it.
    if (!isDemoMode() && business.id !== businessId) {
      throw new AppError("אין הרשאה ליצירת טופס עבור עסק זה", {
        code: "FORBIDDEN",
        status: 403,
      });
    }

    const template = (await getTemplates()).find((item) => item.id === templateId);
    if (!template) {
      throw new AppError("הדרישה הרגולטורית לא נמצאה", {
        code: "TEMPLATE_NOT_FOUND",
        status: 404,
      });
    }

    // The police requirement maps to a different form per licensing item.
    const generatorKey = resolveGeneratorKey(template.generator_key, business);
    const definition = generatorKey ? getFormDefinition(generatorKey) : null;
    if (!definition) {
      throw new AppError("לדרישה זו אין טופס אוטומטי", {
        code: "FORM_NOT_SUPPORTED",
        status: 400,
      });
    }

    const profile = parseBusinessProfile(business);

    if (!profile.success) {
      throw new AppError("יש להשלים את פרטי העסק לפני יצירת הטופס", {
        code: "PROFILE_INCOMPLETE",
        status: 422,
      });
    }

    const generatedAt = new Date();
    const bytes = await buildAutoFilledForm({
      definition,
      business: toFormBusinessDetails(profile.data),
      generatedAt,
    });

    return {
      fileName: buildFormFileName(definition, generatedAt),
      mimeType: "application/pdf",
      base64: Buffer.from(bytes).toString("base64"),
      formTitle: definition.title,
    };
  } catch (error) {
    throw new AppError(toUserMessage(error), {
      code: error instanceof AppError ? error.code : "GENERATE_FORM_FAILED",
      status: error instanceof AppError ? error.status : 500,
      cause: error,
    });
  }
}
