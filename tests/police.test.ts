import { describe, expect, it } from "vitest";
import {
  applyPoliceRouting,
  POLICE_CAPACITY_THRESHOLD,
  POLICE_GENERATOR_KEY,
  resolveGeneratorKey,
  resolvePoliceRequirement,
} from "@/lib/police";
import type { DashboardDocument, DocumentTemplate } from "@/lib/types";

/**
 * Whether the police form is required is a legal question, and both wrong
 * answers cost the customer: a false exemption leaves them operating without a
 * required approval, a false requirement sends them to fill a form for nothing.
 */

const business = (over: Partial<Parameters<typeof resolvePoliceRequirement>[0]> = {}) => ({
  licensing_item: "4.2a" as const,
  max_capacity: 80,
  sells_alcohol: false,
  ...over,
});

describe("resolvePoliceRequirement", () => {
  it("says nothing about a business that has not chosen a licensing item", () => {
    expect(resolvePoliceRequirement(business({ licensing_item: null })).status).toBe("not_applicable");
    expect(resolvePoliceRequirement(business({ licensing_item: "other" })).status).toBe("not_applicable");
  });

  it("exempts a small restaurant that does not serve alcohol", () => {
    expect(resolvePoliceRequirement(business()).status).toBe("exempt");
    expect(resolvePoliceRequirement(business({ licensing_item: "4.2b" })).status).toBe("exempt");
  });

  it("requires the form once alcohol is served", () => {
    expect(resolvePoliceRequirement(business({ sells_alcohol: true })).status).toBe("required");
  });

  it("treats the capacity threshold as inclusive", () => {
    expect(resolvePoliceRequirement(business({ max_capacity: POLICE_CAPACITY_THRESHOLD })).status).toBe(
      "exempt",
    );
    expect(resolvePoliceRequirement(business({ max_capacity: POLICE_CAPACITY_THRESHOLD + 1 })).status).toBe(
      "required",
    );
  });

  // Silence is not an exemption: without a capacity we cannot claim one.
  it("requires the form when capacity was never answered", () => {
    expect(resolvePoliceRequirement(business({ max_capacity: null })).status).toBe("required");
  });

  it("always requires the form for a bar, and warns above the threshold", () => {
    const small = resolvePoliceRequirement(business({ licensing_item: "4.8", max_capacity: 50 }));
    expect(small).toMatchObject({ status: "required", warning: null });

    const large = resolvePoliceRequirement(
      business({ licensing_item: "4.8", max_capacity: POLICE_CAPACITY_THRESHOLD }),
    );
    expect(large.status).toBe("required");
    expect(large.status === "required" && large.warning).toContain("נספח");
  });
});

describe("resolveGeneratorKey", () => {
  it("swaps the sentinel for the form that matches the licensing item", () => {
    expect(resolveGeneratorKey(POLICE_GENERATOR_KEY, { licensing_item: "4.8" })).toBe("police_4_8");
    expect(resolveGeneratorKey(POLICE_GENERATOR_KEY, { licensing_item: "4.2a" })).toBe("police_4_2a");
    expect(resolveGeneratorKey(POLICE_GENERATOR_KEY, { licensing_item: null })).toBeNull();
  });

  it("leaves every other form alone", () => {
    expect(resolveGeneratorKey("fire_safety", { licensing_item: "4.8" })).toBe("fire_safety");
    expect(resolveGeneratorKey(null, { licensing_item: "4.8" })).toBeNull();
  });
});

describe("applyPoliceRouting", () => {
  const policeTemplate = {
    id: "police",
    name: "אישור משטרה",
    category: "Municipality",
    default_validity_months: 12,
    is_default_active: false,
    applies_to_hint: null,
    generator_key: POLICE_GENERATOR_KEY,
  } as unknown as DocumentTemplate;

  const otherCard = { id: "fire", generator_key: "fire_safety" } as unknown as DashboardDocument;
  const policeCard = { ...policeTemplate, document: null, status: "missing" } as DashboardDocument;

  it("adds the card when the law requires it even if the business never ticked it", () => {
    const result = applyPoliceRouting({
      documents: [otherCard],
      catalog: [policeTemplate],
      requirement: { status: "required", generatorKey: "police_4_8", warning: null },
    });
    expect(result).toHaveLength(2);
    expect(result.some((item) => item.generator_key === POLICE_GENERATOR_KEY)).toBe(true);
  });

  it("removes the card when the business is exempt even if it did tick it", () => {
    const result = applyPoliceRouting({
      documents: [otherCard, policeCard],
      catalog: [policeTemplate],
      requirement: { status: "exempt", message: "פטור" },
    });
    expect(result).toEqual([otherCard]);
  });

  it("does not add the card twice", () => {
    const result = applyPoliceRouting({
      documents: [policeCard],
      catalog: [policeTemplate],
      requirement: { status: "required", generatorKey: "police_4_8", warning: null },
    });
    expect(result).toHaveLength(1);
  });

  it("leaves the list untouched when the catalog has no police template", () => {
    const result = applyPoliceRouting({
      documents: [otherCard],
      catalog: [],
      requirement: { status: "required", generatorKey: "police_4_8", warning: null },
    });
    expect(result).toEqual([otherCard]);
  });
});
