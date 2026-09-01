import type { AutoFormDefinition, FormBusinessDetails } from "../forms/definitions";
import { fillTemplateForm } from "./fill-template";
import { synthesizeForm } from "./synthesize-form";

/**
 * Entry point for the auto-fill engine: definitions that ship with an official
 * PDF (`public/templates`) are filled on top of the real form, the rest are
 * generated from their definition.
 */
export async function buildAutoFilledForm(input: {
  definition: AutoFormDefinition;
  business: FormBusinessDetails;
  generatedAt: Date;
}): Promise<Uint8Array> {
  const { definition } = input;

  if (definition.template) {
    return fillTemplateForm({ ...input, template: definition.template });
  }

  return synthesizeForm(input);
}

export function buildFormFileName(definition: AutoFormDefinition, generatedAt: Date): string {
  const stamp = generatedAt.toISOString().slice(0, 10);
  return `${definition.fileSlug}-${stamp}.pdf`;
}
