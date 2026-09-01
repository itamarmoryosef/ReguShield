/**
 * Bidirectional text handling for pdf-lib.
 *
 * pdf-lib lays glyphs out through fontkit, and fontkit already reverses a glyph
 * run whose dominant script is right-to-left. Handing it text that we reversed
 * ourselves therefore renders Hebrew backwards. Fontkit's reversal is also
 * unconditional per run, so digits inside a Hebrew string come out reversed too
 * ("200248722" -> "227842002").
 *
 * The fix is to do the bidi analysis here, but leave the character reversal to
 * fontkit: split the text into directional runs (simplified UAX #9), hand each
 * run to pdf-lib separately, and position the runs right-to-left ourselves.
 * See `drawBidiText` in `./text.ts` for the positioning half.
 */

const RTL_LETTER = /[\u0590-\u05FF\u0700-\u074F\u0780-\u07BF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_LETTER = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;
const DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
// Symbols that always belong to the number/Latin run next to them (50%, 150$).
const LTR_SYMBOL = /[%$€₪£°+±=~^*|]/;
// Combining marks (niqqud, ta'amim) stay attached to the letter before them.
const COMBINING = /[\u0300-\u036F\u0591-\u05C7\u064B-\u0655\u0670\u06D6-\u06DC]/;

const MIRRORED: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
  "\u201C": "\u201D",
  "\u201D": "\u201C",
};

export type Direction = "rtl" | "ltr";
type CharClass = Direction | "neutral";

export type BidiRun = {
  dir: Direction;
  /** The run in logical order. */
  text: string;
  /** The exact string to hand to `page.drawText`. */
  pdfText: string;
};

function classify(char: string): CharClass {
  if (RTL_LETTER.test(char)) return "rtl";
  if (LTR_LETTER.test(char) || DIGIT.test(char) || LTR_SYMBOL.test(char)) return "ltr";
  return "neutral";
}

/** Splits into grapheme-ish clusters so combining marks never get detached. */
function toClusters(text: string): string[] {
  const clusters: string[] = [];

  for (const char of Array.from(text)) {
    if (clusters.length > 0 && COMBINING.test(char)) {
      clusters[clusters.length - 1] += char;
      continue;
    }
    clusters.push(char);
  }

  return clusters;
}

function mirror(text: string): string {
  return toClusters(text)
    .map((cluster) => {
      const base = cluster.slice(0, 1);
      return (MIRRORED[base] ?? base) + cluster.slice(1);
    })
    .join("");
}

function reverseClusters(text: string): string {
  return toClusters(text).reverse().join("");
}

/**
 * Fontkit reverses a run when it detects a right-to-left script, which only
 * happens if the run actually contains an RTL letter. Runs that carry the RTL
 * base direction but no RTL letter (a lone bracket, " - ") must therefore be
 * reversed here instead.
 */
function toPdfText(dir: Direction, text: string): string {
  if (dir === "ltr") return text;

  const mirrored = mirror(text);
  return RTL_LETTER.test(mirrored) ? mirrored : reverseClusters(mirrored);
}

/** True when the text contains at least one right-to-left letter. */
export function isRtlText(text: string): boolean {
  return RTL_LETTER.test(text);
}

/**
 * Splits text into directional runs, in logical order.
 *
 * Neutral characters (spaces, punctuation) take the LTR direction only when they
 * sit between two LTR runs - that is what keeps "ReguShield Ltd" and
 * "03-1234567" in one piece - otherwise they follow the RTL base direction.
 */
export function toBidiRuns(text: string): BidiRun[] {
  if (text.length === 0) return [];

  const classified: { dir: CharClass; text: string }[] = [];

  for (const cluster of toClusters(text)) {
    const dir = classify(cluster.slice(0, 1));
    const last = classified[classified.length - 1];

    if (last && last.dir === dir) {
      last.text += cluster;
      continue;
    }
    classified.push({ dir, text: cluster });
  }

  const resolved: { dir: Direction; text: string }[] = [];

  classified.forEach((run, index) => {
    const dir: Direction =
      run.dir === "neutral"
        ? classified[index - 1]?.dir === "ltr" && classified[index + 1]?.dir === "ltr"
          ? "ltr"
          : "rtl"
        : run.dir;

    const last = resolved[resolved.length - 1];
    if (last && last.dir === dir) {
      last.text += run.text;
      return;
    }
    resolved.push({ dir, text: run.text });
  });

  return resolved.map((run) => ({
    dir: run.dir,
    text: run.text,
    pdfText: toPdfText(run.dir, run.text),
  }));
}

type Measure = (text: string) => number;

/** Wraps in logical order; each returned line is drawn with `drawBidiText`. */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
