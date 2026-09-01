import type { Color, PDFFont, PDFPage } from "pdf-lib";
import { isRtlText, toBidiRuns } from "./rtl";

export type TextAlign = "right" | "center" | "left";

/** Total advance width of the laid-out line. */
export function measureBidiText(text: string, font: PDFFont, size: number): number {
  return toBidiRuns(text).reduce((total, run) => total + font.widthOfTextAtSize(run.pdfText, size), 0);
}

/**
 * Draws a line of mixed Hebrew/Latin text. Each directional run is drawn on its
 * own so fontkit only ever reorders single-script text, and the runs are placed
 * right-to-left (Hebrew base direction) or left-to-right for Latin-only text.
 *
 * `x` is the right edge for `right`, the centre for `center` and the left edge
 * for `left`.
 */
export function drawBidiText(
  page: PDFPage,
  options: {
    text: string;
    font: PDFFont;
    size: number;
    x: number;
    y: number;
    color?: Color;
    align?: TextAlign;
  },
): number {
  const { text, font, size, x, y, color, align = "right" } = options;

  const runs = toBidiRuns(text).map((run) => ({
    pdfText: run.pdfText,
    width: font.widthOfTextAtSize(run.pdfText, size),
  }));

  const total = runs.reduce((sum, run) => sum + run.width, 0);
  const rightEdge = align === "right" ? x : align === "center" ? x + total / 2 : x + total;

  // Logical order runs from the right edge leftwards for RTL text; a Latin-only
  // line has a single run, so the same walk places it correctly.
  let cursor = rightEdge;
  for (const run of runs) {
    cursor -= run.width;
    page.drawText(run.pdfText, { x: cursor, y, size, font, color });
  }

  return total;
}

export { isRtlText };
