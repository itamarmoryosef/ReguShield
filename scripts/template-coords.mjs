import { readFile } from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const file = process.argv[2];
const pageNumber = Number(process.argv[3] ?? 1);
const data = new Uint8Array(await readFile(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: false }).promise;
const page = await doc.getPage(pageNumber);
const content = await page.getTextContent();

const items = content.items
  .filter((item) => "str" in item && item.str.trim())
  .map((item) => ({
    text: item.str.trim(),
    x: Math.round(item.transform[4]),
    y: Math.round(item.transform[5]),
    w: Math.round(item.width),
  }));

const rows = new Map();
for (const item of items) {
  const key = item.y;
  if (!rows.has(key)) rows.set(key, []);
  rows.get(key).push(item);
}

const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
for (const [y, row] of sorted) {
  const line = row
    .sort((a, b) => b.x - a.x)
    .map((item) => `${item.text}[x=${item.x},w=${item.w}]`)
    .join("  ");
  console.log(`y=${String(y).padStart(3)}  ${line}`);
}
