import { z } from "zod";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך חייב להיות בפורמט YYYY-MM-DD");

export const uuidSchema = z.string().uuid("מזהה לא תקין");

export const documentStatusSchema = z.enum(["valid", "expiring_soon", "expired", "missing"]);
/**
 * Item numbers of the licensing decree that decide which police requirements
 * apply. "other" covers businesses outside the food group.
 */
export const licensingItemSchema = z.enum(["4.2a", "4.2b", "4.8", "other"]);
/** Who signs the fire safety declaration, which the form asks to tick. */
export const declarerRoleSchema = z.enum(["owner", "corporate_signatory"]);
/** State of each security measure in the police appendix table. */
export const securityStateSchema = z.enum(["unknown", "exists", "partial", "missing"]);
export const securityMeasuresSchema = z.object({
  guards: securityStateSchema,
  fence: securityStateSchema,
  controlRoom: securityStateSchema,
  alarm: securityStateSchema,
  cameras: securityStateSchema,
});
/** Free remarks per measure, for the "הערות" column of the same table. */
export const securityNotesSchema = z.object({
  guards: z.string(),
  fence: z.string(),
  controlRoom: z.string(),
  alarm: z.string(),
  cameras: z.string(),
});
export const documentCategorySchema = z.enum(["Fire", "Health", "Municipality"]);
export const userRoleSchema = z.enum(["business", "partner"]);
export const reminderChannelSchema = z.enum(["whatsapp"]);
export const reminderJobStatusSchema = z.enum([
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
]);

export const partnerSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  logo_url: z.string().nullable(),
  created_at: z.string(),
});

const nullableText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

export const businessSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  partner_id: uuidSchema.nullable(),
  name: z.string().min(1),
  hp_number: z.string().nullable(),
  address: z.string().nullable(),
  owner_name: nullableText,
  phone: nullableText,
  mobile: nullableText,
  fax: nullableText,
  email: nullableText,
  manager_name: nullableText,
  manager_phone: nullableText,
  shift_manager_phone: nullableText,
  security_phone: nullableText,
  general_description: nullableText,
  declarer_role: declarerRoleSchema.nullish().transform((value) => value ?? "owner"),
  security_measures: securityMeasuresSchema
    .nullish()
    .transform((value) => value ?? null),
  security_notes: securityNotesSchema.nullish().transform((value) => value ?? null),
  accessibility_consultant_name: nullableText,
  accessibility_consultant_id: nullableText,
  accessibility_consultant_registry: nullableText,
  accessibility_consultant_registry_number: nullableText,
  serial_number: nullableText,
  file_number: nullableText,
  business_description: nullableText,
  total_area: nullableText,
  built_area: nullableText,
  professional_approvals: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? null),
  licensing_item: licensingItemSchema.nullish().transform((value) => value ?? null),
  max_capacity: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  employee_count: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  sells_alcohol: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  profile_completed_at: nullableText,
  templates_configured_at: nullableText,
  created_at: z.string(),
});

const areaSchema = z
  .string()
  .trim()
  .min(1, "יש למלא שטח במ״ר")
  .max(10)
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "יש למלא מספר במ״ר, לדוגמה 120 או 85.5");

/**
 * Head counts arrive from text inputs, so a blank field means "not answered"
 * rather than zero - the police routing must not treat unknown as small.
 */
const countSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce
    .number({ invalid_type_error: "יש למלא מספר" })
    .int("יש למלא מספר שלם")
    .min(0, "יש למלא מספר חיובי")
    .max(100000, "המספר גדול מדי")
    .nullable(),
);

/** Extra contact details: printed when filled in, skipped when blank. */
const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-() ]*$/, "מספר טלפון לא תקין")
  .optional()
  .default("");

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().default("");

const measureState = securityStateSchema.optional().default("unknown");

const securityMeasuresInputSchema = z
  .object({
    guards: measureState,
    fence: measureState,
    controlRoom: measureState,
    alarm: measureState,
    cameras: measureState,
  })
  .optional()
  .default({});

// The remarks column is narrow, so long text would have to shrink to stay inside.
const measureNote = optionalText(60, "ההערה ארוכה מדי לעמודת ההערות בטופס");

const securityNotesInputSchema = z
  .object({
    guards: measureNote,
    fence: measureNote,
    controlRoom: measureNote,
    alarm: measureNote,
    cameras: measureNote,
  })
  .optional()
  .default({});

export const businessProfileInputSchema = z.object({
  name: z.string().trim().min(2, "יש למלא את שם העסק").max(160),
  hp_number: z
    .string()
    .trim()
    .min(8, "ח.פ / ת.ז חייב להכיל לפחות 8 ספרות")
    .max(20)
    .regex(/^[0-9-]+$/, "ח.פ / ת.ז יכול להכיל ספרות ומקפים בלבד"),
  address: z.string().trim().min(5, "יש למלא כתובת מלאה").max(200),
  owner_name: z.string().trim().min(2, "יש למלא את שם בעל העסק").max(120),
  phone: z
    .string()
    .trim()
    .min(9, "מספר טלפון לא תקין")
    .max(20)
    .regex(/^[0-9+\-() ]+$/, "מספר טלפון לא תקין"),
  // Printed in the "דואר אלקטרוני" box of the declarant details.
  email: z.string().trim().max(160).email("כתובת דוא״ל לא תקינה"),
  // Required by the fire safety declaration, taken from the licensing decree.
  serial_number: z.string().trim().min(1, "יש למלא את המספר הסידורי").max(30),
  // Printed in the header of the accessibility affidavit. Businesses that have
  // not opened a licensing file yet leave it blank, so it stays optional.
  file_number: z.string().trim().max(40, "מספר התיק ארוך מדי").optional().default(""),
  business_description: z.string().trim().min(2, "יש למלא את תיאור העיסוק").max(160),
  total_area: areaSchema,
  built_area: areaSchema,
  // Clause 7 of the fire safety declaration: approvals from licensed
  // professionals. Optional, and blank rows are dropped so the printed lines
  // fill from the top.
  professional_approvals: z
    .array(z.string().trim().max(160, "התיאור ארוך מדי"))
    .max(4, "אפשר לציין עד ארבעה אישורים")
    .optional()
    .default([])
    .transform((list) => list.filter(Boolean)),
  // Drives the police requirements: which form applies, and whether the
  // business is exempt from it altogether.
  licensing_item: licensingItemSchema.optional().default("other"),
  max_capacity: countSchema,
  employee_count: countSchema,
  sells_alcohol: z.boolean().optional().default(false),
  // Contact details the official forms ask for beside the landline.
  mobile: optionalPhone,
  fax: optionalPhone,
  // The police appendix asks for the people who run the business day to day.
  manager_name: optionalText(120, "השם ארוך מדי"),
  manager_phone: optionalPhone,
  shift_manager_phone: optionalPhone,
  security_phone: optionalPhone,
  // "תיאור כללי של העסק" in the police appendix, wider than the decree wording.
  general_description: optionalText(400, "התיאור ארוך מדי"),
  security_measures: securityMeasuresInputSchema,
  security_notes: securityNotesInputSchema,
  // Ticked on the fire safety declaration; a corporate signatory also prints
  // the company name and number.
  declarer_role: declarerRoleSchema.optional().default("owner"),
  // Part C of the accessibility affidavit, optional by law.
  accessibility_consultant_name: optionalText(120, "השם ארוך מדי"),
  accessibility_consultant_id: optionalText(20, "מספר הזהות ארוך מדי"),
  accessibility_consultant_registry: optionalText(80, "שם הפנקס ארוך מדי"),
  accessibility_consultant_registry_number: optionalText(40, "מספר הרישום ארוך מדי"),
});

export const documentTemplateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  category: documentCategorySchema,
  default_validity_months: z.number().int().positive(),
  is_default_active: z.boolean().optional().default(true),
  applies_to_hint: z.string().nullish().transform((value) => value ?? null),
  generator_key: z.string().nullish().transform((value) => value ?? null),
});

export const generateFormInputSchema = z.object({
  businessId: uuidSchema,
  templateId: uuidSchema,
});

export const generatedFormSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  base64: z.string().min(64),
  formTitle: z.string().min(1),
});

export const setActiveTemplatesInputSchema = z.object({
  businessId: uuidSchema,
  templateIds: z.array(uuidSchema).max(100),
});

export const clientDocumentSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  template_id: uuidSchema,
  status: documentStatusSchema,
  file_path: z.string().nullish().transform((value) => value ?? null),
  issue_date: isoDateSchema.nullable(),
  expiry_date: isoDateSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export const profileSchema = z.object({
  id: uuidSchema,
  role: userRoleSchema,
  partner_id: uuidSchema.nullable(),
  full_name: z.string().nullable(),
  created_at: z.string().optional(),
});

export const businessComplianceSummarySchema = z.object({
  business_id: uuidSchema,
  partner_id: uuidSchema.nullable(),
  name: z.string(),
  hp_number: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.string(),
  required_count: z.coerce.number().int().nonnegative().optional().default(0),
  missing_count: z.coerce.number().int().nonnegative(),
  expired_count: z.coerce.number().int().nonnegative(),
  expiring_soon_count: z.coerce.number().int().nonnegative(),
  valid_count: z.coerce.number().int().nonnegative(),
});

export const scanDocumentInputSchema = z
  .object({
    imageBase64: z.string().min(1).optional(),
    fileUrl: z.string().url("קישור הקובץ אינו תקין").optional(),
    mimeType: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.imageBase64 || value.fileUrl), {
    message: "יש לספק קובץ (base64) או קישור לקובץ",
  });

export const scanDocumentResultSchema = z.object({
  template_id: z.string().nullable(),
  template_name: z.string().nullable(),
  issue_date: isoDateSchema.nullable(),
  expiry_date: isoDateSchema.nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().min(1),
});

export const openaiScanPayloadSchema = z.object({
  template_id: z.union([z.string(), z.null()]).optional(),
  template_name: z.union([z.string(), z.null()]).optional(),
  issue_date: z.union([isoDateSchema, z.null()]).optional(),
  expiry_date: z.union([isoDateSchema, z.null()]).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const saveScannedDocumentInputSchema = z.object({
  businessId: uuidSchema,
  fileBase64: z.string().min(32, "קובץ ריק או פגום"),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  scan: scanDocumentResultSchema,
  fallbackTemplateId: uuidSchema.optional(),
});

export const signedUrlRequestSchema = z.object({
  documentId: uuidSchema,
});

const emailSchema = z
  .string()
  .trim()
  .email({ message: "כתובת דוא״ל לא תקינה" });

const passwordSchema = z
  .string()
  .min(6, { message: "הסיסמה חייבת להכיל לפחות 6 תווים" });

export const signInSchema = z.object({
  email: emailSchema.or(z.literal("")),
  password: z.string(),
  role: userRoleSchema,
});

export const signUpSchema = z.object({
  email: emailSchema.or(z.literal("")),
  password: z.string(),
  role: userRoleSchema,
  full_name: z.string().trim().max(120).optional().default(""),
  organization: z.string().trim().max(160).optional().default(""),
  hp_number: z.string().trim().max(20).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
});

export const liveSignInSchema = signInSchema.extend({
  email: emailSchema,
  password: passwordSchema,
});

export const liveSignUpSchema = signUpSchema.extend({
  email: emailSchema,
  password: passwordSchema,
  organization: z.string().trim().min(2, "יש למלא את שם העסק או המשרד").max(160),
});

export const jobProviderSchema = z.enum(["qstash", "trigger", "manual"]);

export const dueDocumentSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  template_id: uuidSchema,
  expiry_date: isoDateSchema.nullable(),
  status: documentStatusSchema,
});

export const reminderJobRowSchema = z.object({
  id: uuidSchema,
  status: reminderJobStatusSchema,
  attempt_count: z.number().int().nonnegative(),
  max_attempts: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export const replaceDocumentResultSchema = z.object({
  document_id: uuidSchema,
  previous_file_path: z.string().nullable(),
});

export const reminderEnqueuePayloadSchema = z.object({
  event_id: z.string().min(1),
  look_ahead_days: z.number().int().min(1).max(90).optional().default(60),
  scheduled_for: z.string().datetime().optional(),
});

export const reminderProcessPayloadSchema = z.object({
  event_id: z.string().min(1),
  job_id: uuidSchema,
});

export const reminderRetryPayloadSchema = z.object({
  event_id: z.string().min(1),
  job_id: uuidSchema,
  reason: z.string().max(500).optional(),
});

export type ScanDocumentInput = z.infer<typeof scanDocumentInputSchema>;
export type ScanDocumentResult = z.infer<typeof scanDocumentResultSchema>;
export type SaveScannedDocumentInput = z.infer<typeof saveScannedDocumentInputSchema>;
export type SetActiveTemplatesInput = z.infer<typeof setActiveTemplatesInputSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;
export type GenerateFormInput = z.infer<typeof generateFormInputSchema>;
export type GeneratedForm = z.infer<typeof generatedFormSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ReminderEnqueuePayload = z.infer<typeof reminderEnqueuePayloadSchema>;
export type ReminderProcessPayload = z.infer<typeof reminderProcessPayloadSchema>;
export type ReminderRetryPayload = z.infer<typeof reminderRetryPayloadSchema>;
