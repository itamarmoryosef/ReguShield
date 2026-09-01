/**
 * The accessibility affidavit is addressed to the licensing authority of the
 * city the business sits in, and we only store one free-text address. Israeli
 * addresses put the city last, after the house number ("שבט יששכר 31 פתח תקווה")
 * or after a comma ("רחוב דיזנגוף 101, תל אביב-יפו"), so the city is whatever
 * follows the last number.
 */

const HAS_DIGIT = /\d/;
const HEBREW_LETTER = /[\u0590-\u05ff]/;

/** Trailing details that are part of the street address, never the city. */
const NOT_A_CITY = /^(דירה|קומה|כניסה|בניין|בנין|מיקוד|ת\.?ד|קניון|חנות|מבנה)\b/;

function cityFromSegment(segment: string): string {
  const words = segment.split(/\s+/).filter(Boolean);
  const lastNumber = words.findLastIndex((word) => HAS_DIGIT.test(word));
  const candidate = (lastNumber === -1 ? words : words.slice(lastNumber + 1)).join(" ");

  if (!HEBREW_LETTER.test(candidate) || NOT_A_CITY.test(candidate)) return "";
  return candidate;
}

/**
 * Best-effort city name out of a free-text address. Returns an empty string when
 * the address is too vague to guess, so the affidavit is left blank rather than
 * addressed to the wrong authority.
 */
export function extractLocalAuthority(address: string | null | undefined): string {
  const segments = (address ?? "")
    .split(/[,;|\n]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments.reverse()) {
    const city = cityFromSegment(segment);
    if (city) return city;
  }

  return "";
}
