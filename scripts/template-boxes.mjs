import { readFile } from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const { OPS } = pdfjs;

/**
 * Prints the ruled lines of a template so field boxes can be measured.
 *
 * Templates draw their tables either as `rectangle` ops or as moveTo/lineTo
 * strokes, and some are exported with a non-identity transform, so the current
 * transformation matrix is tracked and applied to every point.
 *
 *   node scripts/template-boxes.mjs public/templates/<file>.pdf <page> [minLength]
 */

const [file, pageArg, minArg] = process.argv.slice(2);
const pageNumber = Number(pageArg ?? 1);
const minLength = Number(minArg ?? 15);

const data = new Uint8Array(await readFile(file));
const doc = await pdfjs.getDocument({ data }).promise;
const page = await doc.getPage(pageNumber);
const ops = await page.getOperatorList();

const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

let ctm = [1, 0, 0, 1, 0, 0];
const stack = [];
const segments = [];

function addSegment(from, to) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  if (Math.abs(y1 - y2) < 1 && Math.abs(x1 - x2) >= minLength) {
    segments.push({ dir: "h", y: Math.round(y1), a: Math.round(Math.min(x1, x2)), b: Math.round(Math.max(x1, x2)) });
  } else if (Math.abs(x1 - x2) < 1 && Math.abs(y1 - y2) >= minLength) {
    segments.push({ dir: "v", x: Math.round(x1), a: Math.round(Math.min(y1, y2)), b: Math.round(Math.max(y1, y2)) });
  }
}

for (let i = 0; i < ops.fnArray.length; i += 1) {
  const fn = ops.fnArray[i];

  if (fn === OPS.save) {
    stack.push(ctm);
    continue;
  }
  if (fn === OPS.restore) {
    ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    continue;
  }
  if (fn === OPS.transform) {
    ctm = multiply(ctm, ops.argsArray[i]);
    continue;
  }
  if (fn !== OPS.constructPath) continue;

  const [opList, argList] = ops.argsArray[i];
  let cursor = 0;
  let current = null;
  let start = null;

  for (const op of opList) {
    if (op === OPS.moveTo) {
      current = apply(ctm, argList[cursor], argList[cursor + 1]);
      start = current;
      cursor += 2;
    } else if (op === OPS.lineTo) {
      const next = apply(ctm, argList[cursor], argList[cursor + 1]);
      if (current) addSegment(current, next);
      current = next;
      cursor += 2;
    } else if (op === OPS.curveTo) {
      current = apply(ctm, argList[cursor + 4], argList[cursor + 5]);
      cursor += 6;
    } else if (op === OPS.closePath) {
      if (current && start) addSegment(current, start);
      current = start;
    } else if (op === OPS.rectangle) {
      const [x, y, w, h] = argList.slice(cursor, cursor + 4);
      const corners = [
        apply(ctm, x, y),
        apply(ctm, x + w, y),
        apply(ctm, x + w, y + h),
        apply(ctm, x, y + h),
      ];
      addSegment(corners[0], corners[1]);
      addSegment(corners[1], corners[2]);
      addSegment(corners[2], corners[3]);
      addSegment(corners[3], corners[0]);
      cursor += 4;
    }
  }
}

const key = (s) => (s.dir === "h" ? `h${s.y}:${s.a}:${s.b}` : `v${s.x}:${s.a}:${s.b}`);
const unique = [...new Map(segments.map((s) => [key(s), s])).values()];

console.log(`page ${pageNumber}: ${unique.length} ruled segments (min length ${minLength})`);

console.log("\nhorizontal (y, x-range):");
for (const s of unique.filter((s) => s.dir === "h").sort((a, b) => b.y - a.y || a.a - b.a)) {
  console.log(`  y=${String(s.y).padStart(3)}  x=${s.a}..${s.b}  (w=${s.b - s.a})`);
}

console.log("\nvertical (x, y-range):");
for (const s of unique.filter((s) => s.dir === "v").sort((a, b) => b.x - a.x || b.a - a.a)) {
  console.log(`  x=${String(s.x).padStart(3)}  y=${s.a}..${s.b}  (h=${s.b - s.a})`);
}
