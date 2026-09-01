import { renderPage } from "./lib/render-page.mjs";

/**
 * Finds the fill-in lines of a template by rendering the page and looking for
 * long runs of dark pixels. Unlike `template-boxes.mjs` this also catches lines
 * drawn as underscore characters, which is how most government forms mark the
 * blanks the applicant is supposed to fill.
 *
 *   node scripts/template-lines.mjs public/templates/<file>.pdf <page> [minLength] [maxY] [minY]
 */

const [file, pageArg, minArg, maxYArg, minYArg] = process.argv.slice(2);
const pageNumber = Number(pageArg ?? 1);
const minLength = Number(minArg ?? 25);
const scale = 4;

const { data, width, height, pageHeight, pageWidth } = await renderPage(file, pageNumber, scale);
const viewportWidth = pageWidth;

const isDark = (x, y) => data[(y * width + x) * 4] < 140;

/** Dark runs per pixel row, in PDF points. */
const runs = [];
for (let y = 0; y < height; y += 1) {
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    if (x < width && isDark(x, y)) {
      if (start === -1) start = x;
      continue;
    }
    if (start !== -1) {
      const length = (x - start) / scale;
      // Runs that reach the paper edge come from watermarks and page frames.
      const insidePage = start / scale > 2 && x / scale < viewportWidth - 2;
      if (length >= minLength && insidePage) {
        runs.push({ y, left: start / scale, right: x / scale, length });
      }
      start = -1;
    }
  }
}

/** A thick rule spans several pixel rows; keep one entry per line. */
const lines = [];
for (const run of runs) {
  const previous = lines.find(
    (line) =>
      run.y - line.lastRow <= 2 &&
      Math.abs(run.left - line.left) < 3 &&
      Math.abs(run.right - line.right) < 3,
  );

  if (previous) {
    previous.lastRow = run.y;
    continue;
  }
  lines.push({ ...run, lastRow: run.y });
}

const found = lines
  .map((line) => ({
    y: Math.round((pageHeight - line.y / scale) * 10) / 10,
    left: Math.round(line.left),
    right: Math.round(line.right),
    width: Math.round(line.length),
  }))
  .filter((line) => (maxYArg ? line.y <= Number(maxYArg) : true))
  .filter((line) => (minYArg ? line.y >= Number(minYArg) : true))
  .sort((a, b) => b.y - a.y || a.left - b.left);

console.log(`page ${pageNumber}: ${found.length} fill-in lines (min length ${minLength}pt)\n`);
for (const line of found) {
  console.log(`  y=${String(line.y).padStart(6)}  x=${line.left}..${line.right}  (w=${line.width})`);
}
