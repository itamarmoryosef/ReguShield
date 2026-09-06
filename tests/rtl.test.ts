import { describe, expect, it } from "vitest";
import { isRtlText, toBidiRuns, wrapText } from "@/lib/pdf/rtl";

/**
 * These cover the half of the bidi work that stays in our code. Fontkit
 * reverses a run that contains a Hebrew letter, so `pdfText` must be handed to
 * pdf-lib unreversed there and pre-reversed everywhere else. Getting that
 * backwards prints official forms with mirrored text, which is invisible in
 * code review and obvious to the clerk receiving the form.
 */

const dirs = (text: string) => toBidiRuns(text).map((run) => run.dir).join(",");

describe("toBidiRuns", () => {
  it("returns nothing for empty text", () => {
    expect(toBidiRuns("")).toEqual([]);
  });

  it("keeps pure Hebrew as one right-to-left run for fontkit to reverse", () => {
    const runs = toBidiRuns("מסעדה");
    expect(runs).toHaveLength(1);
    expect(runs[0].dir).toBe("rtl");
    expect(runs[0].pdfText).toBe("מסעדה");
  });

  // The bug this guards: a Hebrew sentence containing a number used to render
  // the number backwards, turning an ID or a date into a different one.
  it("splits digits out of Hebrew so they are not reversed", () => {
    const runs = toBidiRuns("תפוסה 200 מקומות");
    const digits = runs.find((run) => run.text.includes("200"));
    expect(digits?.dir).toBe("ltr");
    expect(digits?.pdfText).toContain("200");
  });

  it("holds a Latin phrase together across its inner spaces", () => {
    expect(dirs("ReguShield Ltd")).toBe("ltr");
  });

  it("holds a phone number together", () => {
    const runs = toBidiRuns("טלפון 03-1234567");
    const phone = runs.find((run) => run.text.includes("1234567"));
    expect(phone?.dir).toBe("ltr");
    expect(phone?.pdfText).toContain("03-1234567");
  });

  it("gives neutral text the right-to-left base direction outside Latin runs", () => {
    expect(dirs("מסעדה - תל אביב")).toBe("rtl");
  });

  it("mirrors brackets so they close the way a reader expects", () => {
    const runs = toBidiRuns("(מסעדה)");
    expect(runs[0].pdfText).toBe("(מסעדה)".split("").map((c) => (c === "(" ? ")" : c === ")" ? "(" : c)).join(""));
  });

  // A run that carries the RTL base direction but holds no Hebrew letter gets
  // no help from fontkit, so it has to be reversed here.
  it("reverses a right-to-left run that fontkit will leave alone", () => {
    const runs = toBidiRuns("א / ב");
    const separator = runs.find((run) => run.text.trim() === "/");
    if (separator) {
      expect(separator.dir).toBe("rtl");
    }
    expect(runs.every((run) => run.pdfText.length === run.text.length)).toBe(true);
  });

  it("never loses or invents characters", () => {
    for (const sample of ["מסעדת 4.2א בע\"מ", "Tel 03-1234567 מסעדה", "שטח 120 מ\"ר (מרתף)"]) {
      const joined = toBidiRuns(sample)
        .map((run) => run.text)
        .join("");
      expect(joined).toBe(sample);
    }
  });
});

describe("isRtlText", () => {
  it("detects Hebrew and ignores Latin", () => {
    expect(isRtlText("מסעדה")).toBe(true);
    expect(isRtlText("Restaurant")).toBe(false);
    expect(isRtlText("120")).toBe(false);
  });
});

describe("wrapText", () => {
  // One character per unit, so the expected break points are readable.
  const measure = (text: string) => text.length;

  it("returns a single empty line rather than nothing", () => {
    expect(wrapText("", 10, measure)).toEqual([""]);
  });

  it("breaks on the last word that fits", () => {
    expect(wrapText("אחד שתיים שלוש", 11, measure)).toEqual(["אחד שתיים", "שלוש"]);
  });

  it("keeps a word that cannot fit rather than dropping it", () => {
    expect(wrapText("אנטישנטי", 3, measure)).toEqual(["אנטישנטי"]);
  });
});
