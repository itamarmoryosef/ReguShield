import type { z } from "zod";
import type {
  adminBusinessRowSchema,
  adminUserRowSchema,
  businessComplianceSummarySchema,
  businessProfileInputSchema,
  businessSchema,
  generatedFormSchema,
  clientDocumentSchema,
  documentCategorySchema,
  documentStatusSchema,
  declarerRoleSchema,
  documentTemplateSchema,
  licensingItemSchema,
  partnerBrandingInputSchema,
  partnerSchema,
  securityMeasuresSchema,
  securityNotesSchema,
  securityStateSchema,
  profileSchema,
  scanDocumentResultSchema,
  userRoleSchema,
} from "./validation/schemas";

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type DocumentCategory = z.infer<typeof documentCategorySchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type LicensingItem = z.infer<typeof licensingItemSchema>;
export type DeclarerRole = z.infer<typeof declarerRoleSchema>;
export type SecurityState = z.infer<typeof securityStateSchema>;
export type SecurityMeasures = z.infer<typeof securityMeasuresSchema>;
export type SecurityNotes = z.infer<typeof securityNotesSchema>;
export type Partner = z.infer<typeof partnerSchema>;
export type Business = z.infer<typeof businessSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;
export type GeneratedForm = z.infer<typeof generatedFormSchema>;
export type DocumentTemplate = z.infer<typeof documentTemplateSchema>;
export type ClientDocument = z.infer<typeof clientDocumentSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type PartnerBrandingInput = z.infer<typeof partnerBrandingInputSchema>;
export type AdminUserRow = z.infer<typeof adminUserRowSchema>;
export type AdminBusinessRow = z.infer<typeof adminBusinessRowSchema>;
export type BusinessComplianceSummary = z.infer<typeof businessComplianceSummarySchema>;
export type ScanDocumentResult = z.infer<typeof scanDocumentResultSchema>;

export type DashboardDocument = DocumentTemplate & {
  document: ClientDocument | null;
  status: DocumentStatus;
};

export type ChecklistTemplate = DocumentTemplate & {
  active: boolean;
  hasDocument: boolean;
};
