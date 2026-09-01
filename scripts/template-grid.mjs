import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { encodePng } from "./lib/png.mjs";
import { renderPage } from "./lib/render-page.mjs";

/**
 * Renders a template page to PNG with a labelled PDF-point grid on top, so
 * placement boxes can be read straight off the image.
 *
 *   node scripts/template-grid.mjs public/templates/<file>.pdf <page> <out.png> [scale] [left,bottom,right,top]
 */

const [file, pageArg, outArg, scaleArg, boxArg] = process.argv.slice(2);
const pageNumber = Number(pageArg ?? 1);
const scale = Number(scaleArg ?? 2);
const out = outArg ?? "tmp/grid.png";

const rendered = await renderPage(file, pageNumber, scale);
const { pageWidth, pageHeight } = rendered;

const crop = boxArg ? boxArg.split(",").map(Number) : [0, 0, pageWidth, pageHeight];
const [left, bottom, right, top] = crop;

const width = Math.round((right - left) * scale);
const height = Math.round((top - bottom) * scale);
const pixels = Buffer.alloc(width * height * 4, 0xff);

// Copy the cropped region of the page into the output image.
for (let y = 0; y < height; y += 1) {
  const sourceY = y + Math.round((pageHeight - top) * scale);
  if (sourceY < 0 || sourceY >= rendered.height) continue;

  for (let x = 0; x < width; x += 1) {
    const sourceX = x + Math.round(left * scale);
    if (sourceX < 0 || sourceX >= rendered.width) continue;

    rendered.data.copy(pixels, (y * width + x) * 4, (sourceY * rendered.width + sourceX) * 4, (sourceY * rendered.width + sourceX) * 4 + 4);
  }
}

function blend(x, y, [r, g, b], alpha) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;

  const index = (y * width + x) * 4;
  pixels[index] = pixels[index] * (1 - alpha) + r * alpha;
  pixels[index + 1] = pixels[index + 1] * (1 - alpha) + g * alpha;
  pixels[index + 2] = pixels[index + 2] * (1 - alpha) + b * alpha;
}

const RED = [200, 0, 0];
const BLUE = [0, 120, 255];

const toPixelX = (x) => Math.round((x - left) * scale);
const toPixelY = (y) => Math.round((top - y) * scale);

// 3x5 bitmap digits, so the axis labels need no font dependency.
const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "010"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "001", "001", "001"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};

function drawLabel(value, atX, atY) {
  const dot = Math.max(1, Math.round(scale / 2));
  let cursor = atX;

  for (const character of String(value)) {
    const glyph = DIGITS[character];
    if (!glyph) continue;

    glyph.forEach((row, rowIndex) => {
      [...row].forEach((on, columnIndex) => {
        if (on !== "1") return;
        for (let dy = 0; dy < dot; dy += 1) {
          for (let dx = 0; dx < dot; dx += 1) {
            blend(cursor + columnIndex * dot + dx, atY + rowIndex * dot + dy, RED, 1);
          }
        }
      });
    });
    cursor += 4 * dot;
  }
}

for (let x = Math.ceil(left / 10) * 10; x <= right; x += 10) {
  const major = x % 50 === 0;
  for (let y = 0; y < height; y += 1) blend(toPixelX(x), y, major ? RED : BLUE, major ? 0.5 : 0.15);
  if (major) {
    drawLabel(x, toPixelX(x) + 2, 2);
    drawLabel(x, toPixelX(x) + 2, height - 6 * Math.max(1, Math.round(scale / 2)));
  }
}

for (let y = Math.ceil(bottom / 10) * 10; y <= top; y += 10) {
  const major = y % 50 === 0;
  for (let x = 0; x < width; x += 1) blend(x, toPixelY(y), major ? RED : BLUE, major ? 0.5 : 0.15);
  if (major) {
    drawLabel(y, 2, toPixelY(y) + 2);
    drawLabel(y, width - 14 * Math.max(1, Math.round(scale / 2)), toPixelY(y) + 2);
  }
}

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, encodePng(width, height, pixels));
console.log(
  `page ${pageNumber} of ${path.basename(file)} -> ${out} ` +
    `(box ${left},${bottom},${right},${top} @${scale}x = ${width}x${height}px)`,
);
