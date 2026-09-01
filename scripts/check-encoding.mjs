import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".git", "assets"]);
const EXT = new Set([".ts", ".tsx", ".sql", ".css", ".mjs", ".json", ".md"]);

// Characters that are legitimate in this codebase.
const ALLOWED = new Set([
  "\u05F3", // Hebrew geresh
  "\u05F4", // Hebrew gershayim
  "\u00B7", // middot separator
  "\u00A9", // copyright
  "\u20AA", // shekel sign
  "\u2013",
  "\u2014",
  "\u2018",
  "\u2019",
  "\u201C",
  "\u201D",
  "\u2026",
  "\u00AB",
  "\u00BB",
]);

const MOJIBAKE = /[\u00C0-\u00FF\u0152-\u0178\u02C6\u2030\u0161\u0153\uFFFD]/;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (EXT.has(path.extname(entry.name))) {
      yield path.join(dir, entry.name);
    }
  }
}

let problems = 0;

for await (const file of walk(ROOT)) {
  const raw = await readFile(file);
  const text = raw.toString("utf8");
  const rel = path.relative(ROOT, file);

  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    console.log(`BOM      ${rel}`);
    problems += 1;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const suspicious = Array.from(line).filter(
      (char) => !ALLOWED.has(char) && MOJIBAKE.test(char),
    );
    if (suspicious.length > 0) {
      console.log(`MOJIBAKE ${rel}:${index + 1}  ${[...new Set(suspicious)].join("")}`);
      console.log(`         ${line.trim().slice(0, 120)}`);
      problems += 1;
    }
  });
}

console.log(problems === 0 ? "OK  no encoding problems found" : `FOUND ${problems} problem lines`);
process.exit(problems > 0 ? 1 : 0);
