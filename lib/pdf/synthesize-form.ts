import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AutoFormDefinition, FormBusinessDetails } from "../forms/definitions";
import { loadFormFonts } from "./fonts";
import { wrapText } from "./rtl";
import { drawBidiText, measureBidiText } from "./text";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.87, 0.9);
const ACCENT = rgb(0.31, 0.27, 0.9);

type Writer = {
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

function drawRtl(
  writer: Writer,
  text: string,
  options: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; indent?: number },
) {
  drawBidiText(writer.page, {
    text,
    font: options.font,
    size: options.size,
    x: PAGE_WIDTH - MARGIN - (options.indent ?? 0),
    y: writer.y,
    color: options.color ?? INK,
    align: "right",
  });
}

function drawParagraph(
  writer: Writer,
  text: string,
  options: { font: PDFFont; size: number; lineHeight: number; color?: ReturnType<typeof rgb>; indent?: number },
) {
  const indent = options.indent ?? 0;
  const lines = wrapText(text, CONTENT_WIDTH - indent, (value) =>
    measureBidiText(value, options.font, options.size),
  );

  for (const line of lines) {
    drawRtl(writer, line, {
      font: options.font,
      size: options.size,
      color: options.color,
      indent,
    });
    writer.y -= options.lineHeight;
  }
}

function drawFieldCell(
  writer: Writer,
  options: { label: string; value: string; right: number; width: number; top: number },
) {
  const { label, value, right, width, top } = options;

  drawBidiText(writer.page, {
    text: label,
    font: writer.regular,
    size: 8.5,
    x: right,
    y: top,
    color: MUTED,
  });

  drawBidiText(writer.page, {
    text: value,
    font: writer.bold,
    size: 11.5,
    x: right,
    y: top - 17,
    color: INK,
  });

  writer.page.drawLine({
    start: { x: right - width, y: top - 24 },
    end: { x: right, y: top - 24 },
    thickness: 0.75,
    color: LINE,
  });
}

/**
 * Builds a form from scratch for definitions that have no official PDF template
 * in `public/templates` yet.
 */
export async function synthesizeForm(input: {
  definition: AutoFormDefinition;
  business: FormBusinessDetails;
  generatedAt: Date;
}): Promise<Uint8Array> {
  const { definition, business, generatedAt } = input;
  const fonts = await loadFormFonts();

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const writer: Writer = { page, regular, bold, y: PAGE_HEIGHT - MARGIN };

  const dateLabel = generatedAt.toLocaleDateString("he-IL");

  pdf.setTitle(`${definition.title} - ${business.name}`);
  pdf.setAuthor("ReguShield");
  pdf.setSubject(definition.subtitle);
  pdf.setCreationDate(generatedAt);

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 6,
    width: PAGE_WIDTH,
    height: 6,
    color: ACCENT,
  });

  drawRtl(writer, definition.authority, { font: bold, size: 10.5, color: ACCENT });
  page.drawText("ReguShield", {
    x: MARGIN,
    y: writer.y,
    size: 10.5,
    font: bold,
    color: MUTED,
  });
  writer.y -= 34;

  drawRtl(writer, definition.title, { font: bold, size: 19 });
  writer.y -= 20;
  drawRtl(writer, definition.subtitle, { font: regular, size: 10.5, color: MUTED });
  writer.y -= 26;

  page.drawLine({
    start: { x: MARGIN, y: writer.y },
    end: { x: PAGE_WIDTH - MARGIN, y: writer.y },
    thickness: 1,
    color: LINE,
  });
  writer.y -= 30;

  drawRtl(writer, "פרטי העסק", { font: bold, size: 12.5 });
  writer.y -= 26;

  const columnWidth = (CONTENT_WIDTH - 24) / 2;
  const rightColumn = PAGE_WIDTH - MARGIN;
  const leftColumn = rightColumn - columnWidth - 24;
  const cells: { label: string; value: string }[] = [
    { label: "שם העסק", value: business.name },
    { label: "ח.פ / ת.ז", value: business.hpNumber },
    { label: "כתובת העסק", value: business.address },
    { label: "שם בעל העסק", value: business.ownerName },
    { label: "טלפון", value: business.phone },
    { label: "תאריך הגשה", value: dateLabel },
  ];

  for (let index = 0; index < cells.length; index += 2) {
    const top = writer.y;
    drawFieldCell(writer, { ...cells[index], right: rightColumn, width: columnWidth, top });
    const second = cells[index + 1];
    if (second) {
      drawFieldCell(writer, { ...second, right: leftColumn, width: columnWidth, top });
    }
    writer.y = top - 46;
  }

  writer.y -= 8;
  drawRtl(writer, definition.sectionTitle, { font: bold, size: 12.5 });
  writer.y -= 24;

  drawParagraph(writer, definition.intro(business), {
    font: regular,
    size: 11,
    lineHeight: 19,
  });
  writer.y -= 12;

  for (const declaration of definition.declarations) {
    page.drawCircle({
      x: PAGE_WIDTH - MARGIN - 3,
      y: writer.y + 4,
      size: 2,
      color: ACCENT,
    });
    drawParagraph(writer, declaration, {
      font: regular,
      size: 10.5,
      lineHeight: 18,
      indent: 16,
    });
    writer.y -= 6;
  }

  writer.y -= 24;
  const signatureTop = writer.y;
  const signatureFields: { label: string; right: number }[] = [
    { label: "תאריך", right: rightColumn },
    { label: "חתימת בעל העסק וחותמת", right: leftColumn },
  ];

  for (const field of signatureFields) {
    page.drawLine({
      start: { x: field.right - columnWidth, y: signatureTop },
      end: { x: field.right, y: signatureTop },
      thickness: 0.75,
      color: INK,
    });
    drawBidiText(page, {
      text: field.label,
      font: regular,
      size: 9.5,
      x: field.right,
      y: signatureTop - 14,
      color: MUTED,
    });
  }

  writer.y = MARGIN + 46;
  page.drawLine({
    start: { x: MARGIN, y: writer.y + 18 },
    end: { x: PAGE_WIDTH - MARGIN, y: writer.y + 18 },
    thickness: 0.75,
    color: LINE,
  });
  drawParagraph(writer, definition.closing, {
    font: regular,
    size: 8.5,
    lineHeight: 13,
    color: MUTED,
  });

  return pdf.save();
}
