import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { toBidiRuns, wrapText } from "../lib/pdf/rtl.ts";
import { AUTO_FORM_KEYS, getFormDefinition, resolveFormFieldValues } from "../lib/forms/definitions.ts";
import { extractLocalAuthority } from "../lib/forms/local-authority.ts";
import {
  POLICE_GENERATOR_KEY,
  policeGeneratorKey,
  resolveGeneratorKey,
  resolvePoliceRequirement,
} from "../lib/police.ts";
import { buildAutoFilledForm } from "../lib/pdf/generate-form.ts";

const fontPath = path.join(process.cwd(), "assets", "fonts", "DavidLibre-Regular.ttf");
const font = fontkit.create(await readFile(fontPath));

let failures = 0;

function check(ok, message) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
}

/**
 * Reproduces what ends up on the page: pdf-lib hands each run to fontkit, which
 * reorders RTL scripts itself, and `drawBidiText` places the runs right-to-left.
 * Reading the glyphs left-to-right must give the expected visual order.
 */
function renderedText(text) {
  return toBidiRuns(text)
    .reverse()
    .map((run) =>
      font
        .layout(run.pdfText)
        .glyphs.map((glyph) => glyph.codePoints.map((cp) => String.fromCodePoint(cp)).join(""))
        .join(""),
    )
    .join("");
}

console.log("--- rendered order (as it appears on the page, left to right) ---");
const cases = [
  ["איתמר", "רמתיא"],
  ["מזנון מהיר", "ריהמ ןונזמ"],
  ["שלום", "םולש"],
  ["ח.פ 514000001", "514000001 פ.ח"],
  ["מספר זהות 200248722", "200248722 תוהז רפסמ"],
  ["200248722", "200248722"],
  ["ReguShield", "ReguShield"],
  ["טלפון: 03-1234567", "03-1234567 :ןופלט"],
  ["העסק (ח.פ 514)", "(514 פ.ח) קסעה"],
  ["מערכת ReguShield Ltd בענן", "ןנעב ReguShield Ltd תכרעמ"],
  ["רחוב דיזנגוף 101, תל אביב", "ביבא לת ,101 ףוגנזיד בוחר"],
  ["דואר: info@regushield.co.il", "info@regushield.co.il :ראוד"],
  ["תוקף עד 31/12/2026.", ".31/12/2026 דע ףקות"],
  ["שטח 120 מ\"ר", 'ר"מ 120 חטש'],
  ["מזנון מהיר - אשדוד", "דודשא - ריהמ ןונזמ"],
];

for (const [input, expected] of cases) {
  const actual = renderedText(input);
  check(actual === expected, `"${input}" renders as "${actual}"${actual === expected ? "" : ` (expected "${expected}")`}`);
}

const wrapped = wrapText("אני החתום מטה מצהיר בזאת כי בעסק מתקיימות דרישות הבטיחות", 120, (t) => t.length * 6);
check(
  !wrapped.some((line) => line.length * 6 > 120 && line.includes(" ")),
  `wrapText produced ${wrapped.length} lines within the max width`,
);

console.log("\n--- font coverage ---");
console.log(`font: ${font.familyName} / glyphs: ${font.numGlyphs}`);

const business = {
  name: "מסעדת הים התיכון",
  hpNumber: "514000001",
  address: "רחוב דיזנגוף 101, תל אביב",
  ownerName: "ישראל ישראלי",
  phone: "03-1234567",
  email: "office@my-restaurant.co.il",
  serialNumber: "4.2 א",
  fileNumber: "2024-1187",
  businessDescription: "מסעדה - הכנה והגשה של מזון",
  totalArea: "180",
  builtArea: "120",
  maxCapacity: "220",
  employeeCount: "14",
  mobile: "052-1234567",
  fax: "03-1234568",
  managerName: "דנה לוי",
  managerPhone: "052-7654321",
  shiftManagerPhone: "053-1122334",
  securityPhone: "054-9988776",
  generalDescription: "מסעדה בקומת קרקע עם אולם אירוח, מטבח מאחור וחצר פתוחה לרחוב.",
  securityMeasures: {
    guards: "missing",
    fence: "partial",
    controlRoom: "unknown",
    alarm: "exists",
    cameras: "exists",
  },
  securityNotes: {
    guards: "מאבטח בסופי שבוע בלבד",
    fence: "גדר בחזית בלבד",
    controlRoom: "",
    alarm: "מחוברת למוקד חברת אבטחה",
    cameras: "6 מצלמות וכספת במשרד",
  },
  declarerRole: "corporate_signatory",
  accessibilityConsultantName: "רונית ברק",
  accessibilityConsultantId: "312456789",
  accessibilityConsultantRegistry: "פנקס מורשי נגישות שירות",
  accessibilityConsultantRegistryNumber: "1284",
  professionalApprovals: [
    "אישור תקינות מתקן גז - טכנאי גז מוסמך",
    "אישור ניקוי מנדפים - חברת ניקוי מוסמכת",
    "אישור בדיקת מערכת חשמל - חשמלאי בודק",
    "אישור בדיקת מטפי כיבוי - מכון בדיקות",
  ],
};

const labels = [
  "פרטי העסק",
  "שם העסק",
  "ח.פ / ת.ז",
  "כתובת העסק",
  "שם בעל העסק",
  "טלפון",
  "תאריך הגשה",
  "חתימת בעל העסק וחותמת",
  "תאריך",
  new Date().toLocaleDateString("he-IL"),
];

const missing = new Set();
for (const key of AUTO_FORM_KEYS) {
  const def = getFormDefinition(key);
  const texts = [
    def.title,
    def.authority,
    def.subtitle,
    def.intro(business),
    def.sectionTitle,
    def.closing,
    ...def.declarations,
    ...labels,
    ...Object.values(business).flat().filter((value) => typeof value === "string"),
    ...Object.values(resolveFormFieldValues(business, new Date())),
  ];
  for (const text of texts) {
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (!font.hasGlyphForCodePoint(cp)) {
        missing.add(`${char} (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
      }
    }
  }
}

check(missing.size === 0, missing.size === 0 ? "all characters have glyphs in David Libre" : `missing glyphs: ${[...missing].join(", ")}`);

console.log("\n--- local authority from address ---");
const addresses = [
  ["שבט יששכר 31 פתח תקווה", "פתח תקווה"],
  ["רחוב דיזנגוף 101, תל אביב-יפו", "תל אביב-יפו"],
  ["שוק מחנה יהודה, ירושלים", "ירושלים"],
  ["רח׳ אלנבי 50, תל אביב, קומה 2", "תל אביב"],
  ["הרצל 12 ראשון לציון", "ראשון לציון"],
  ["חיפה", "חיפה"],
  ["", ""],
];
for (const [address, expected] of addresses) {
  const actual = extractLocalAuthority(address);
  check(actual === expected, `"${address}" -> "${actual}"${actual === expected ? "" : ` (expected "${expected}")`}`);
}

console.log("\n--- police routing ---");
const routingCases = [
  // A bar always needs the form, and above 200 seats also the two appendices.
  [{ licensing_item: "4.8", max_capacity: 80, sells_alcohol: true }, "required", false],
  [{ licensing_item: "4.8", max_capacity: 200, sells_alcohol: true }, "required", true],
  [{ licensing_item: "4.8", max_capacity: 350, sells_alcohol: true }, "required", true],
  // Restaurants and buffets are exempt only when small and dry.
  [{ licensing_item: "4.2a", max_capacity: 120, sells_alcohol: false }, "exempt", false],
  [{ licensing_item: "4.2b", max_capacity: 200, sells_alcohol: false }, "exempt", false],
  [{ licensing_item: "4.2a", max_capacity: 120, sells_alcohol: true }, "required", false],
  [{ licensing_item: "4.2b", max_capacity: 260, sells_alcohol: false }, "required", false],
  // An unknown capacity must not be read as "small".
  [{ licensing_item: "4.2a", max_capacity: null, sells_alcohol: false }, "required", false],
  [{ licensing_item: "other", max_capacity: 120, sells_alcohol: false }, "not_applicable", false],
  [{ licensing_item: null, max_capacity: 120, sells_alcohol: true }, "not_applicable", false],
];
for (const [input, expectedStatus, expectsWarning] of routingCases) {
  const requirement = resolvePoliceRequirement(input);
  const hasWarning = requirement.status === "required" && Boolean(requirement.warning);
  const generatorKey = requirement.status === "required" ? requirement.generatorKey : "-";
  check(
    requirement.status === expectedStatus && hasWarning === expectsWarning,
    `${input.licensing_item ?? "null"} / ${input.max_capacity ?? "null"} / ` +
      `${input.sells_alcohol ? "אלכוהול" : "ללא אלכוהול"} -> ${requirement.status} (${generatorKey})` +
      `${hasWarning ? " + נספחים א'/ב'" : ""}`,
  );
}
for (const item of ["4.2a", "4.2b", "4.8"]) {
  const key = policeGeneratorKey(item);
  check(
    Boolean(key && getFormDefinition(key).template),
    `item ${item} -> ${key} (${key ? getFormDefinition(key).template.fileName : "missing"})`,
  );
}

// The dashboard card carries a sentinel key that the PDF engine resolves per item.
check(
  resolveGeneratorKey(POLICE_GENERATOR_KEY, { licensing_item: "4.8" }) === "police_4_8" &&
    resolveGeneratorKey(POLICE_GENERATOR_KEY, { licensing_item: "other" }) === null &&
    resolveGeneratorKey("fire_safety_declaration", { licensing_item: "4.8" }) ===
      "fire_safety_declaration",
  "generator key of the police card follows the licensing item",
);

console.log("\n--- placement sanity ---");
for (const key of AUTO_FORM_KEYS) {
  const template = getFormDefinition(key).template;
  if (!template) continue;

  for (const placement of template.placements) {
    const { box } = placement;
    const width = box.right - box.left;
    const height = box.top - box.bottom;
    // Tick boxes are as small as the printed box they mark, unlike value cells.
    const minWidth = placement.text ? 5 : 20;
    const minHeight = placement.text ? 5 : 10;
    check(
      width > minWidth &&
        height > minHeight &&
        box.right <= 595 &&
        box.top <= 842 &&
        box.left >= 0 &&
        box.bottom >= 0,
      `${key} / ${placement.key}: page ${placement.page + 1} box ${width}x${height} at (${box.left},${box.bottom})`,
    );
  }
}

console.log("\n--- form generation ---");
for (const key of AUTO_FORM_KEYS) {
  const definition = getFormDefinition(key);
  const generatedAt = new Date();

  try {
    const bytes = await buildAutoFilledForm({ definition, business, generatedAt });
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const expectedPages = definition.template?.expectedPageCount ?? 1;
    check(
      pdf.getPageCount() === expectedPages && bytes.length > 1000,
      `${key}: ${pdf.getPageCount()} page(s), ${(bytes.length / 1024).toFixed(0)} KB` +
        (definition.template ? ` (filled ${definition.template.fileName})` : " (synthesised)"),
    );
  } catch (error) {
    check(false, `${key}: ${error.message}`);
  }
}

process.exit(failures > 0 ? 1 : 0);
