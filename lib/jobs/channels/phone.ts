/**
 * Israeli phone numbers, normalised to the form WhatsApp expects.
 *
 * The profile form accepts whatever the owner types — "050-378-1924",
 * "+972 50 378 1924", "(03) 1234567" — while the Cloud API wants digits only,
 * with a country code and no leading zero. Getting this wrong does not fail
 * loudly: WhatsApp accepts the request and the message goes nowhere.
 */

const ISRAEL = "972";

/** Mobile prefixes, without the national leading zero. */
const MOBILE_PREFIXES = ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59"];

/**
 * Converts a typed number to E.164 digits, or null when it cannot be trusted.
 *
 * Returning null on anything doubtful is deliberate: a silently wrong number
 * is worse than no number, because the reminder then appears to have been sent.
 */
export function toE164Israel(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Keep a leading + so an already-international number is recognisable, and
  // drop everything else people use as separators.
  const trimmed = raw.trim();
  const explicitlyInternational = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (explicitlyInternational) {
    const withoutPrefix = digits.replace(/^00/, "");
    // Only Israeli numbers are supported; anything else is left alone rather
    // than being guessed at.
    if (!withoutPrefix.startsWith(ISRAEL)) return null;
    return validateIsraeli(withoutPrefix.slice(ISRAEL.length));
  }

  if (digits.startsWith(ISRAEL)) {
    return validateIsraeli(digits.slice(ISRAEL.length));
  }

  // National format: a single leading zero stands in for the country code.
  if (digits.startsWith("0")) {
    return validateIsraeli(digits.slice(1));
  }

  return validateIsraeli(digits);
}

/**
 * `subscriber` is the number without country code and without the national
 * leading zero: 9 digits for a mobile (5X plus seven), 8 for most landlines.
 */
function validateIsraeli(subscriber: string): string | null {
  if (subscriber.startsWith("0")) return null;
  if (subscriber.length < 8 || subscriber.length > 9) return null;
  return `${ISRAEL}${subscriber}`;
}

/**
 * True when the number can receive WhatsApp.
 *
 * A landline cannot, so sending to one wastes a message and reports success.
 */
export function isMobile(e164: string | null): boolean {
  if (!e164 || !e164.startsWith(ISRAEL)) return false;
  const subscriber = e164.slice(ISRAEL.length);
  return subscriber.length === 9 && MOBILE_PREFIXES.includes(subscriber.slice(0, 2));
}

/** Picks the first number that could actually receive a WhatsApp message. */
export function pickWhatsAppNumber(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const e164 = toE164Israel(candidate);
    if (isMobile(e164)) return e164;
  }
  return null;
}
