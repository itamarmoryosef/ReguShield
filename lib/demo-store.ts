import { cookies } from "next/headers";
import { DEMO_TEMPLATES } from "./demo-data";
import { businessProfileInputSchema } from "./validation/schemas";
import type { BusinessProfileInput } from "./types";

export const DEMO_ACTIVE_TEMPLATES_COOKIE = "regushield_demo_active_templates";
export const DEMO_BUSINESS_PROFILE_COOKIE = "regushield_demo_business_profile";

// Commas are cookie separators, so ids are joined with a character that cannot
// appear inside a UUID.
const SEPARATOR = ".";

export function demoDefaultActiveTemplateIds(): string[] {
  return DEMO_TEMPLATES.filter((template) => template.is_default_active).map(
    (template) => template.id,
  );
}

export function readDemoActiveTemplateIds(): string[] {
  const raw = cookies().get(DEMO_ACTIVE_TEMPLATES_COOKIE)?.value;
  if (raw === undefined) {
    return demoDefaultActiveTemplateIds();
  }

  const known = new Set(DEMO_TEMPLATES.map((template) => template.id));
  return raw
    .split(SEPARATOR)
    .map((value) => value.trim())
    .filter((value) => known.has(value));
}

export function writeDemoActiveTemplateIds(templateIds: string[]): void {
  cookies().set(DEMO_ACTIVE_TEMPLATES_COOKIE, templateIds.join(SEPARATOR), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// Hebrew values and JSON punctuation are base64-encoded so the cookie value
// stays inside the safe character set.
export function readDemoBusinessProfile(): BusinessProfileInput | null {
  const raw = cookies().get(DEMO_BUSINESS_PROFILE_COOKIE)?.value;
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = businessProfileInputSchema.safeParse(JSON.parse(decoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeDemoBusinessProfile(profile: BusinessProfileInput): void {
  const encoded = Buffer.from(JSON.stringify(profile), "utf8").toString("base64url");
  cookies().set(DEMO_BUSINESS_PROFILE_COOKIE, encoded, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
