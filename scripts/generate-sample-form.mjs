import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getFormDefinition } from "../lib/forms/definitions.ts";
import { buildAutoFilledForm, buildFormFileName } from "../lib/pdf/generate-form.ts";

/**
 * Dev helper: renders a filled form with sample data so field coordinates can be
 * eyeballed and fine-tuned.
 *
 *   npm run form:sample [generator_key] [outDir]
 */

const key = process.argv[2] ?? "fire_safety_declaration";
const outDir = process.argv[3] ?? "tmp";

const definition = getFormDefinition(key);
if (!definition) {
  console.error(`unknown generator key: ${key}`);
  process.exit(1);
}

const business = {
  name: "מזנון מהיר",
  hpNumber: "200248722",
  address: "רחוב דיזנגוף 101, תל אביב-יפו",
  ownerName: "איתמר כהן",
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
  generalDescription:
    "מסעדה בקומת קרקע עם אולם אירוח ל-120 מקומות, מטבח מאחור וחצר פתוחה לרחוב.",
  securityMeasures: {
    guards: "missing",
    fence: "partial",
    controlRoom: "missing",
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

const generatedAt = new Date();
const bytes = await buildAutoFilledForm({ definition, business, generatedAt });

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, buildFormFileName(definition, generatedAt));
await writeFile(outFile, bytes);

console.log(`${definition.title}`);
console.log(`source: ${definition.template ? `public/templates/${definition.template.fileName}` : "synthesised"}`);
console.log(`saved:  ${outFile} (${(bytes.length / 1024).toFixed(0)} KB)`);
