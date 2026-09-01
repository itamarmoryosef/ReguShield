"use server";

import { revalidatePath } from "next/cache";
import { DOCUMENT_BUCKET, SIGNED_URL_TTL_SECONDS, isDemoMode } from "@/lib/env";
import { AppError, toUserMessage } from "@/lib/errors";
import { computeDocumentStatus } from "@/lib/status";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  replaceDocumentResultSchema,
  saveScannedDocumentInputSchema,
  signedUrlRequestSchema,
  uuidSchema,
  type SaveScannedDocumentInput,
} from "@/lib/validation/schemas";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function saveScannedDocument(input: SaveScannedDocumentInput) {
  try {
    const validInput = parseOrThrow(saveScannedDocumentInputSchema, input);
    const templateId = validInput.scan.template_id ?? validInput.fallbackTemplateId;

    if (!templateId) {
      throw new AppError("לא זוהה סוג המסמך. בחרו ידנית לאיזה אישור המסמך שייך.", {
        code: "TEMPLATE_UNKNOWN",
      });
    }

    if (!ALLOWED_MIME_TYPES.has(validInput.mimeType)) {
      throw new AppError("סוג הקובץ אינו נתמך. יש להעלות JPG, PNG, WEBP או PDF.", {
        code: "UNSUPPORTED_MIME",
      });
    }

    if (isDemoMode()) {
      return {
        demo: true,
        template_id: templateId,
        status: computeDocumentStatus(validInput.scan.expiry_date),
      };
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new AppError("יש להתחבר כדי להעלות מסמך", { code: "UNAUTHENTICATED", status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", validInput.businessId)
      .maybeSingle();

    if (!business) {
      throw new AppError("לא נמצא בית עסק מורשה להעלאה", { code: "FORBIDDEN", status: 403 });
    }

    const extension = extensionFromMime(validInput.mimeType, validInput.fileName);
    const path = `${validInput.businessId}/${templateId}/${Date.now()}.${extension}`;
    const bytes = Buffer.from(stripDataUrl(validInput.fileBase64), "base64");

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, bytes, { contentType: validInput.mimeType, upsert: false });

    if (uploadError) {
      throw new AppError(`העלאת הקובץ נכשלה: ${uploadError.message}`, {
        code: "UPLOAD_FAILED",
        status: 502,
      });
    }

    const { data: replaced, error: rpcError } = await supabase.rpc("replace_client_document", {
      p_business_id: validInput.businessId,
      p_template_id: templateId,
      p_file_path: path,
      p_issue_date: validInput.scan.issue_date,
      p_expiry_date: validInput.scan.expiry_date,
    });

    if (rpcError || !replaced) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
      throw new AppError(`שמירת המסמך נכשלה: ${rpcError?.message ?? "אין תוצאה"}`, {
        code: "REPLACE_FAILED",
        status: 502,
      });
    }

    const row = Array.isArray(replaced) ? replaced[0] : replaced;
    const parsedReplace = replaceDocumentResultSchema.safeParse(row);
    const previousPath = parsedReplace.success ? parsedReplace.data.previous_file_path : null;

    if (previousPath && previousPath !== path) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([previousPath]);
    }

    revalidatePath("/business");
    revalidatePath("/partner");
    return { demo: false, template_id: templateId };
  } catch (error) {
    throw new AppError(toUserMessage(error), {
      code: error instanceof AppError ? error.code : "SAVE_FAILED",
      status: error instanceof AppError ? error.status : 500,
      cause: error,
    });
  }
}

export async function getDocumentSignedUrl(documentId: string): Promise<{ url: string; expiresIn: number }> {
  const validId = parseOrThrow(signedUrlRequestSchema, { documentId }).documentId;

  if (isDemoMode()) {
    return { url: "/favicon.svg", expiresIn: SIGNED_URL_TTL_SECONDS };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("יש להתחבר כדי לצפות במסמך", { code: "UNAUTHENTICATED", status: 401 });
  }

  const { data: document, error } = await supabase
    .from("client_documents")
    .select("id, file_path")
    .eq("id", validId)
    .maybeSingle();

  if (error || !document?.file_path) {
    throw new AppError("המסמך לא נמצא או שאין הרשאה לצפות בו", { code: "NOT_FOUND", status: 404 });
  }

  const admin = createServiceClient();
  const { data: signed, error: signError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.file_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    throw new AppError("יצירת קישור מאובטח נכשלה", { code: "SIGN_FAILED", status: 502 });
  }

  return { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}

export async function assertBusinessId(businessId: string): Promise<string> {
  return parseOrThrow(uuidSchema, businessId);
}

function stripDataUrl(value: string): string {
  const marker = "base64,";
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : value;
}

function extensionFromMime(mimeType: string, fileName: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  const fromName = fileName.split(".").pop();
  return fromName && fromName.length <= 5 ? fromName : "bin";
}
