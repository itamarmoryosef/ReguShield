import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { AppError } from "../errors";
import {
  resolveFormFieldValues,
  type AutoFormDefinition,
  type FormBusinessDetails,
  type FormTemplateConfig,
  type TemplatePlacement,
} from "../forms/definitions";
import { loadFormFonts } from "./fonts";
import { drawBidiText, measureBidiText } from "./text";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const TEMPLATE_DIR = path.join(process.cwd(), "public", "templates");

const FILL_COLOR = rgb(0.05, 0.11, 0.36);
const DEFAULT_SIZE = 11;
const MIN_SIZE = 6.5;
const DEFAULT_PADDING = 8;
const LINE_HEIGHT = 1.2;

async function loadTemplateBytes(fileName: string): Promise<Uint8Array> {
  const file = path.join(TEMPLATE_DIR, fileName);

  try {
    return new Uint8Array(await readFile(file));
  } catch (error) {
    throw new AppError(
      `לא נמצא קובץ התבנית. יש להעלות את הטופס המקורי לנתיב public/templates/${fileName}`,
      { code: "TEMPLATE_PDF_MISSING", status: 500, cause: error },
    );
  }
}

/**
 * Greedy word wrap. Returns null when the text cannot be laid out at this size -
 * either a single word is wider than the cell, or it needs more lines than the
 * placement allows.
 */
function wrapValue(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (measureBidiText(word, font, size) > maxWidth) return null;

    const candidate = current ? `${current} ${word}` : word;
    if (measureBidiText(candidate, font, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length >= maxLines) return null;
  }

  if (current) lines.push(current);
  return lines.length <= maxLines ? lines : null;
}

/** Shrinks the font until the value fits the blank cell reserved on the form. */
function layoutValue(
  text: string,
  font: PDFFont,
  placement: TemplatePlacement,
  maxWidth: number,
): { size: number; lines: string[] } {
  const maxLines = placement.lines ?? 1;
  const boxHeight = placement.box.top - placement.box.bottom;
  let size = placement.size ?? DEFAULT_SIZE;

  while (size > MIN_SIZE) {
    const lines = wrapValue(text, font, size, maxWidth, maxLines);
    // Single-line cells are allowed to overflow their height: they are ruled
    // lines rather than closed boxes, and the height only bounds a wrapped block.
    const fitsHeight = maxLines === 1 || (lines?.length ?? 0) * size * LINE_HEIGHT <= boxHeight;
    if (lines && fitsHeight) return { size, lines };
    size -= 0.25;
  }

  return { size, lines: wrapValue(text, font, size, maxWidth, maxLines) ?? [text] };
}

/**
 * Places the value inside its cell: horizontally aligned with a padding kept off
 * the border, and vertically centred on the cell so the text sits on the blank
 * line instead of riding its edges.
 */
function drawPlacement(page: PDFPage, font: PDFFont, placement: TemplatePlacement, value: string) {
  const { box } = placement;
  const padding = placement.padding ?? DEFAULT_PADDING;
  const align = placement.align ?? "right";

  const maxWidth = Math.max(box.right - box.left - padding * 2, 1);
  const { size, lines } = layoutValue(value, font, placement, maxWidth);

  const x =
    align === "right"
      ? box.right - padding
      : align === "center"
        ? (box.left + box.right) / 2
        : box.left + padding;

  // 0.32 of the font size approximates half the cap height, which centres the
  // baseline optically inside the cell; a wrapped block is centred as a whole.
  const leading = size * LINE_HEIGHT;
  const firstBaseline = (box.bottom + box.top) / 2 + ((lines.length - 1) * leading) / 2 - size * 0.32;

  lines.forEach((line, index) => {
    drawBidiText(page, {
      text: line,
      font,
      size,
      x: x + (placement.offset?.x ?? 0),
      y: firstBaseline - index * leading + (placement.offset?.y ?? 0),
      color: FILL_COLOR,
      align,
    });
  });
}

/**
 * Loads the official government PDF and writes the business details onto it, so
 * the user prints and signs the real form instead of a look-alike.
 */
export async function fillTemplateForm(input: {
  definition: AutoFormDefinition;
  template: FormTemplateConfig;
  business: FormBusinessDetails;
  generatedAt: Date;
}): Promise<Uint8Array> {
  const { definition, template, business, generatedAt } = input;

  const [templateBytes, fonts] = await Promise.all([
    loadTemplateBytes(template.fileName),
    loadFormFonts(),
  ]);

  const pdf = await PDFDocument.load(templateBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  if (pdf.getPageCount() < template.expectedPageCount) {
    throw new AppError(
      `קובץ התבנית public/templates/${template.fileName} אינו תואם לטופס הצפוי (${template.expectedPageCount} עמודים)`,
      { code: "TEMPLATE_PDF_MISMATCH", status: 500 },
    );
  }

  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fonts.regular, { subset: true });

  const values = resolveFormFieldValues(business, generatedAt);
  const pages = pdf.getPages();

  for (const placement of template.placements) {
    const value = values[placement.key]?.trim();
    if (!value) continue;
    // Tick boxes print a fixed mark, and only for the answer they belong to.
    if (placement.when !== undefined && placement.when !== value) continue;

    drawPlacement(pages[placement.page], font, placement, placement.text ?? value);
  }

  pdf.setTitle(`${definition.title} - ${business.name}`);
  pdf.setAuthor("ReguShield");
  pdf.setSubject(definition.subtitle);
  pdf.setCreationDate(generatedAt);
  pdf.setModificationDate(generatedAt);

  return pdf.save();
}
