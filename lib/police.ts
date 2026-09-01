import type { Business, DashboardDocument, DocumentTemplate, LicensingItem } from "./types";

/**
 * Police requirements for the food group of the licensing decree.
 *
 * Item 4.8 (a business whose main activity is serving alcohol) always needs the
 * police form. Items 4.2a / 4.2b (restaurants and buffets) are exempt as long as
 * they seat up to 200 people and do not serve alcohol; anything above that goes
 * through the police. From 200 seats a bar also owes the two extra appendices.
 */

/** Marks the catalog requirement whose form depends on the licensing item. */
export const POLICE_GENERATOR_KEY = "police_form";

/** Capacity from which the extra appendices of item 4.8 kick in. */
export const POLICE_CAPACITY_THRESHOLD = 200;

export const LICENSING_ITEM_LABELS: Record<LicensingItem, string> = {
  "4.2a": "4.2א - מסעדה / בית קפה",
  "4.2b": "4.2ב - מזנון / בית אוכל אחר",
  "4.8": "4.8 - בר / משקאות משכרים",
  other: "אחר",
};

const GENERATOR_KEYS: Record<LicensingItem, string | null> = {
  "4.2a": "police_4_2a",
  "4.2b": "police_4_2b",
  "4.8": "police_4_8",
  other: null,
};

export type PoliceRequirement =
  | { status: "required"; generatorKey: string; warning: string | null }
  | { status: "exempt"; message: string }
  | { status: "not_applicable" };

type PoliceInput = Pick<Business, "licensing_item" | "max_capacity" | "sells_alcohol">;

/** The police definition that matches the licensing item, if there is one. */
export function policeGeneratorKey(item: LicensingItem | null): string | null {
  return item ? GENERATOR_KEYS[item] : null;
}

/** Resolves the sentinel key of the police requirement into a real form. */
export function resolveGeneratorKey(
  generatorKey: string | null,
  business: Pick<Business, "licensing_item">,
): string | null {
  if (generatorKey !== POLICE_GENERATOR_KEY) return generatorKey;
  return policeGeneratorKey(business.licensing_item);
}

export function resolvePoliceRequirement(business: PoliceInput): PoliceRequirement {
  const item = business.licensing_item;
  const generatorKey = policeGeneratorKey(item);
  if (!item || !generatorKey) return { status: "not_applicable" };

  const capacity = business.max_capacity;

  if (item === "4.8") {
    return {
      status: "required",
      generatorKey,
      warning:
        capacity !== null && capacity >= POLICE_CAPACITY_THRESHOLD
          ? "שים לב: דרוש נספח א' (כספת) ונספח ב' (אישור מהנדס בטיחות) עקב תפוסה מעל 200"
          : null,
    };
  }

  // An unanswered capacity is not treated as small: without it we cannot claim
  // the exemption, so the form stays on the dashboard.
  const smallEnough = capacity !== null && capacity <= POLICE_CAPACITY_THRESHOLD;

  if (smallEnough && !business.sells_alcohol) {
    return {
      status: "exempt",
      message: "פטור מאישור משטרה - פחות מ-200 מקומות וללא אלכוהול",
    };
  }

  return { status: "required", generatorKey, warning: null };
}

/**
 * The police card is driven by the law rather than by the checklist: it is added
 * when it is required even if the business did not tick it, and removed when the
 * business is exempt even if it did.
 */
export function applyPoliceRouting(input: {
  documents: DashboardDocument[];
  catalog: DocumentTemplate[];
  requirement: PoliceRequirement;
}): DashboardDocument[] {
  const { documents, catalog, requirement } = input;
  const isPolice = (template: { generator_key: string | null }) =>
    template.generator_key === POLICE_GENERATOR_KEY;

  if (requirement.status !== "required") return documents.filter((item) => !isPolice(item));
  if (documents.some(isPolice)) return documents;

  const template = catalog.find(isPolice);
  if (!template) return documents;

  return [...documents, { ...template, document: null, status: "missing" }];
}
