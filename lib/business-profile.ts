import type { FormBusinessDetails } from "./forms/definitions";
import type {
  Business,
  BusinessProfileInput,
  SecurityMeasures,
  SecurityNotes,
} from "./types";
import { businessProfileInputSchema } from "./validation/schemas";

/** Nothing answered yet, so the police appendix table stays empty. */
export const DEFAULT_SECURITY_MEASURES: SecurityMeasures = {
  guards: "unknown",
  fence: "unknown",
  controlRoom: "unknown",
  alarm: "unknown",
  cameras: "unknown",
};

export const DEFAULT_SECURITY_NOTES: SecurityNotes = {
  guards: "",
  fence: "",
  controlRoom: "",
  alarm: "",
  cameras: "",
};

/**
 * The profile fields as the forms need them: plain strings, never null. Shared by
 * the profile page, the dashboard completeness check and the PDF generator so
 * they can never disagree about which fields a business still owes us.
 */
export function toProfileInput(business: Business): BusinessProfileInput {
  return {
    name: business.name,
    hp_number: business.hp_number ?? "",
    address: business.address ?? "",
    owner_name: business.owner_name ?? "",
    phone: business.phone ?? "",
    email: business.email ?? "",
    serial_number: business.serial_number ?? "",
    file_number: business.file_number ?? "",
    business_description: business.business_description ?? "",
    total_area: business.total_area ?? "",
    built_area: business.built_area ?? "",
    professional_approvals: business.professional_approvals ?? [],
    licensing_item: business.licensing_item ?? "other",
    max_capacity: business.max_capacity,
    employee_count: business.employee_count,
    sells_alcohol: business.sells_alcohol,
    mobile: business.mobile ?? "",
    fax: business.fax ?? "",
    manager_name: business.manager_name ?? "",
    manager_phone: business.manager_phone ?? "",
    shift_manager_phone: business.shift_manager_phone ?? "",
    security_phone: business.security_phone ?? "",
    general_description: business.general_description ?? "",
    security_measures: business.security_measures ?? DEFAULT_SECURITY_MEASURES,
    security_notes: business.security_notes ?? DEFAULT_SECURITY_NOTES,
    declarer_role: business.declarer_role,
    accessibility_consultant_name: business.accessibility_consultant_name ?? "",
    accessibility_consultant_id: business.accessibility_consultant_id ?? "",
    accessibility_consultant_registry: business.accessibility_consultant_registry ?? "",
    accessibility_consultant_registry_number:
      business.accessibility_consultant_registry_number ?? "",
  };
}

/**
 * Translates the saved profile into the shape the form engine draws from, so the
 * PDF generator and the sample script always fill the same fields.
 */
export function toFormBusinessDetails(profile: BusinessProfileInput): FormBusinessDetails {
  return {
    name: profile.name,
    hpNumber: profile.hp_number,
    address: profile.address,
    ownerName: profile.owner_name,
    phone: profile.phone,
    email: profile.email,
    serialNumber: profile.serial_number,
    fileNumber: profile.file_number,
    businessDescription: profile.business_description,
    totalArea: profile.total_area,
    builtArea: profile.built_area,
    professionalApprovals: profile.professional_approvals,
    maxCapacity: profile.max_capacity?.toString() ?? "",
    employeeCount: profile.employee_count?.toString() ?? "",
    mobile: profile.mobile,
    fax: profile.fax,
    managerName: profile.manager_name,
    managerPhone: profile.manager_phone,
    shiftManagerPhone: profile.shift_manager_phone,
    securityPhone: profile.security_phone,
    generalDescription: profile.general_description,
    securityMeasures: profile.security_measures,
    securityNotes: profile.security_notes,
    declarerRole: profile.declarer_role,
    accessibilityConsultantName: profile.accessibility_consultant_name,
    accessibilityConsultantId: profile.accessibility_consultant_id,
    accessibilityConsultantRegistry: profile.accessibility_consultant_registry,
    accessibilityConsultantRegistryNumber: profile.accessibility_consultant_registry_number,
  };
}

export function parseBusinessProfile(business: Business) {
  return businessProfileInputSchema.safeParse(toProfileInput(business));
}

/** True when every field required to auto-fill official forms is filled in. */
export function isProfileComplete(business: Business): boolean {
  return parseBusinessProfile(business).success;
}
