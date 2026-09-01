import type {
  DeclarerRole,
  SecurityMeasures,
  SecurityNotes,
  SecurityState,
} from "@/lib/types";
import { extractLocalAuthority } from "./local-authority";

export type FormBusinessDetails = {
  name: string;
  hpNumber: string;
  address: string;
  ownerName: string;
  phone: string;
  email?: string;
  /** Serial number of the business in the licensing decree ("צו רישוי עסקים"). */
  serialNumber?: string;
  /** Municipal licensing file number ("מס' תיק רישוי"). */
  fileNumber?: string;
  /** Overrides the authority derived from the address, when it is known. */
  localAuthority?: string;
  /** Occupation description as worded in the licensing decree. */
  businessDescription?: string;
  /** Total business area in square metres. */
  totalArea?: string;
  /** Built area inside the business in square metres. */
  builtArea?: string;
  /** Approvals from licensed professionals, for clause 7 of the declaration. */
  professionalApprovals?: string[];
  /** Maximum number of people allowed in the business ("קיבולת קהל מקסימלית"). */
  maxCapacity?: string;
  /** Number of employees, asked for by the police appendix. */
  employeeCount?: string;
  /** Mobile number, printed beside the landline on most forms. */
  mobile?: string;
  fax?: string;
  /** The people who run the business, for the police appendix tables. */
  managerName?: string;
  managerPhone?: string;
  shiftManagerPhone?: string;
  securityPhone?: string;
  /** Free description of the business, wider than the decree wording. */
  generalDescription?: string;
  /** State of each security measure in the police appendix table. */
  securityMeasures?: SecurityMeasures;
  /** Remarks column of the same table. */
  securityNotes?: SecurityNotes;
  /** Whether the declaration is signed by the owner or a corporate signatory. */
  declarerRole?: DeclarerRole;
  /** Part C of the accessibility affidavit. */
  accessibilityConsultantName?: string;
  accessibilityConsultantId?: string;
  accessibilityConsultantRegistry?: string;
  accessibilityConsultantRegistryNumber?: string;
};

/** Values that can be written onto an official template. */
export type FormFieldKey =
  | "businessName"
  | "address"
  | "hpNumber"
  | "ownerName"
  | "ownerFirstName"
  | "ownerLastName"
  | "phone"
  | "email"
  | "serialNumber"
  | "fileNumber"
  | "localAuthority"
  | "businessDescription"
  | "totalArea"
  | "builtArea"
  | "maxCapacity"
  | "employeeCount"
  | "mobile"
  | "fax"
  | "managerName"
  | "managerFirstName"
  | "managerLastName"
  | "managerPhone"
  | "shiftManagerPhone"
  | "securityPhone"
  | "generalDescription"
  | "corporateDetails"
  | "declarerRole"
  | "securityGuards"
  | "securityFence"
  | "securityControlRoom"
  | "securityAlarm"
  | "securityCameras"
  | "securityGuardsNote"
  | "securityFenceNote"
  | "securityControlRoomNote"
  | "securityAlarmNote"
  | "securityCamerasNote"
  | "accessibilityConsultantName"
  | "accessibilityConsultantId"
  | "accessibilityConsultantRegistry"
  | "accessibilityConsultantRegistryNumber"
  | "approval1"
  | "approval2"
  | "approval3"
  | "approval4"
  | "generatedDate"
  | "generatedDay"
  | "generatedMonth"
  | "generatedYear";

/**
 * The blank cell a value is written into. Coordinates are PDF points with the
 * origin at the bottom-left corner of the page (A4 = 595 x 842), taken from the
 * table rules of the template itself - see `scripts/template-boxes.mjs`.
 */
export type PlacementBox = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};

export type TemplatePlacement = {
  key: FormFieldKey;
  /** Zero-based page index inside the template. */
  page: number;
  box: PlacementBox;
  /** Horizontal alignment inside the box. Hebrew forms are filled from the right. */
  align?: "right" | "left" | "center";
  size?: number;
  /** Inner padding kept clear of the cell borders. */
  padding?: number;
  /** Allows a long value to wrap inside a narrow cell. Defaults to a single line. */
  lines?: number;
  /** Manual nudge applied after the box is resolved, for fine-tuning. */
  offset?: { x?: number; y?: number };
  /** Prints this literal instead of the value, for tick boxes. */
  text?: string;
  /** Prints only when the field holds this exact value. */
  when?: string;
};

export type FormTemplateConfig = {
  /** File name inside `public/templates`. */
  fileName: string;
  /** Guards against silently filling a different revision of the form. */
  expectedPageCount: number;
  placements: TemplatePlacement[];
};

export type AutoFormDefinition = {
  key: string;
  title: string;
  authority: string;
  subtitle: string;
  fileSlug: string;
  intro: (business: FormBusinessDetails) => string;
  sectionTitle: string;
  declarations: string[];
  closing: string;
  /**
   * When present the official PDF is loaded and filled; otherwise the form is
   * synthesised from the definition below.
   */
  template?: FormTemplateConfig;
};

/**
 * Field positions on "תצהיר בבקשה לרשיון עסק - אישור על יסוד תצהיר כבאות".
 *
 * Page 1 has two tables. "פרטי העסק" puts its labels in the right column
 * (x 427-548) and leaves the wide left column (x 51-427) blank for the value,
 * one 34pt row per field. "פרטי המצהיר" is a three column grid (x 49-219,
 * 219-382, 382-545) where the label row sits above the blank value row.
 * Page 3 has the ruled line for the declarant name above its caption.
 */
const BUSINESS_VALUE_COLUMN = { left: 51, right: 427 };
const DECLARANT_COLUMNS = {
  right: { left: 382, right: 545 },
  middle: { left: 219, right: 382 },
  left: { left: 49, right: 219 },
};
/** Baselines of the four ruled lines under clause 7 on page 2. */
const APPROVAL_LINES = [176, 148, 121, 93];

const FIRE_SAFETY_TEMPLATE: FormTemplateConfig = {
  fileName: "fire-safety.pdf",
  expectedPageCount: 3,
  placements: [
    // "פרטי העסק" - one row per label, top to bottom.
    { key: "businessName", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 617, top: 651 } },
    { key: "address", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 583, top: 617 } },
    { key: "serialNumber", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 549, top: 583 } },
    { key: "businessDescription", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 515, top: 549 } },
    { key: "totalArea", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 481, top: 515 } },
    { key: "builtArea", page: 0, box: { ...BUSINESS_VALUE_COLUMN, bottom: 447, top: 481 } },
    // "פרטי המצהיר" - value row under the "שם פרטי / שם משפחה / מספר זהות" labels.
    { key: "ownerFirstName", page: 0, box: { ...DECLARANT_COLUMNS.right, bottom: 216, top: 237 } },
    { key: "ownerLastName", page: 0, box: { ...DECLARANT_COLUMNS.middle, bottom: 216, top: 237 } },
    { key: "hpNumber", page: 0, box: { ...DECLARANT_COLUMNS.left, bottom: 216, top: 237 } },
    // Value row under "טלפון נייח / טלפון נייד / דואר אלקטרוני".
    { key: "phone", page: 0, box: { ...DECLARANT_COLUMNS.right, bottom: 173, top: 195 } },
    { key: "mobile", page: 0, box: { ...DECLARANT_COLUMNS.middle, bottom: 173, top: 195 } },
    { key: "email", page: 0, box: { ...DECLARANT_COLUMNS.left, bottom: 173, top: 195 }, size: 10 },
    // "יש לסמן אחת מהאפשרויות": tick the box beside the option that applies.
    {
      key: "declarerRole",
      page: 0,
      box: { left: 512, right: 522, bottom: 377, top: 384 },
      align: "center",
      size: 10,
      padding: 0,
      text: "X",
      when: "owner",
    },
    {
      key: "declarerRole",
      page: 0,
      box: { left: 512, right: 522, bottom: 336, top: 343 },
      align: "center",
      size: 10,
      padding: 0,
      text: "X",
      when: "corporate_signatory",
    },
    // "[שם התאגיד ומספר ח.פ]" - filled only for a corporate signatory.
    { key: "corporateDetails", page: 0, box: ruledLine(334, 64, 241), align: "center", size: 9 },
    // Page 2, clause 7 ("אישורים מאנשי מקצוע"): four ruled lines, 27-28pt apart,
    // each spanning x 250-504. The box starts at the underscore baseline so the
    // text is drawn just above the rule rather than through it.
    ...APPROVAL_LINES.map((bottom, index) => ({
      key: `approval${index + 1}` as FormFieldKey,
      page: 1,
      box: { left: 250, right: 504, bottom, top: bottom + 15 },
      size: 10,
      padding: 6,
    })),
    // Page 3: sits on the ruled line above "שם המצהיר/ה".
    {
      key: "ownerName",
      page: 2,
      box: { left: 135, right: 244, bottom: 313, top: 329 },
      align: "center",
      size: 10.5,
      offset: { y: 3 },
    },
    // Page 3, "אישור": the lawyer's own blanks (their name, the date and the
    // signature) stay empty, but the two that identify the declarant appearing
    // before them - "הופיע/ה בפני גב'/מר ___ מספר ת.ז. ___" - are the owner's.
    { key: "ownerName", page: 2, box: ruledLine(206, 372, 522), align: "center", size: 10 },
    { key: "hpNumber", page: 2, box: ruledLine(206, 230, 308), align: "center", size: 10 },
  ],
};

const FIRE_SAFETY_DECLARATION: AutoFormDefinition = {
  key: "fire_safety_declaration",
  title: "תצהיר בטיחות אש - מסלול רישוי מקוצר",
  authority: "הרשות הארצית לכבאות והצלה",
  subtitle: "תצהיר בעל העסק לצורך קבלת אישור כבאות במסלול מקוצר",
  fileSlug: "fire-safety-declaration",
  intro: (business) =>
    `אני החתום מטה, ${business.ownerName}, נושא ת.ז / ח.פ ${business.hpNumber}, ` +
    `בעל העסק "${business.name}" שכתובתו ${business.address}, מצהיר בזאת כי בעסק ` +
    "מתקיימות דרישות הבטיחות המפורטות להלן, וכי תצהיר זה מוגש לצורך קבלת אישור " +
    "כבאות במסלול הרישוי המקוצר.",
  sectionTitle: "נוסח ההצהרה",
  declarations: [
    "בעסק מותקנים מטפי כיבוי תקינים ובעלי בדיקה שנתית בתוקף, במקומות נגישים ומסומנים.",
    "דרכי המילוט ופתחי היציאה פנויים ממחסומים, ודלתות היציאה נפתחות בכיוון המילוט.",
    "מותקנים בעסק תאורת חירום ושילוט הכוונה פולט אור לאורך מסלולי המילוט.",
    "מערכת הכיבוי במנדף המטבח נבדקה ונמצאה תקינה, ככל שקיים מנדף בעסק.",
    "מתקני הגז בעסק נבדקו על ידי בעל מקצוע מוסמך, ככל שקיימים מתקני גז.",
    "עובדי העסק תודרכו בשימוש באמצעי הכיבוי ובנוהלי החירום, והתיעוד שמור בעסק.",
    "ידוע לי כי מסירת פרטים כוזבים בתצהיר זה מהווה עבירה על החוק.",
  ],
  closing:
    "התצהיר מולא אוטומטית על בסיס פרטי העסק השמורים במערכת. יש להדפיס, לחתום " +
    "ולאמת את התצהיר בפני עורך דין ככל שנדרש, ולהעלות את המסמך החתום בחזרה למערכת.",
  template: FIRE_SAFETY_TEMPLATE,
};

/**
 * A fill-in line rather than a table cell: the value sits just above the rule.
 */
function ruledLine(y: number, left: number, right: number): PlacementBox {
  return { left, right, bottom: y - 2, top: y + 12 };
}

/**
 * Field positions on "תצהיר של מבקש רישיון עסק/ היתר זמני על התקיימות הוראות
 * הנגישות בעסק" (2 pages).
 *
 * Page 1 holds two tables whose labels sit at the top of each cell, so values
 * are written into the blank space beneath them. "פרטי המצהיר" is a three column
 * row (x 90-267, 267-366, 367-509) and "פרטי העסק" a five column row of 83pt
 * cells (x 90-173 ... 422-505) that is deep enough to wrap long values.
 * Page 2 opens with the declaration body and its two ruled lines at y 721.
 */
const ACCESSIBILITY_DECLARANT_COLUMNS = {
  right: { left: 369, right: 507 },
  middle: { left: 269, right: 364 },
  left: { left: 92, right: 265 },
};
const ACCESSIBILITY_DECLARANT_ROW = { bottom: 474, top: 497 };

/** The five "פרטי העסק" cells, right to left as the form reads. */
const BUSINESS_COLUMNS = {
  name: { left: 424, right: 503 },
  address: { left: 341, right: 420 },
  serialNumber: { left: 258, right: 337 },
  totalArea: { left: 175, right: 254 },
  hpNumber: { left: 92, right: 171 },
};
/** Free space under the one line labels; the area label runs five lines deep. */
const BUSINESS_ROW = { bottom: 330, top: 397 };
const BUSINESS_AREA_ROW = { bottom: 294, top: 314 };

/** Part C: two rows, each split into a right cell (x 316-510) and a left one. */
const CONSULTANT_ROWS = {
  // The labels sit at the top of each cell, so values are written below them.
  identity: { bottom: 179, top: 196 },
  registry: { bottom: 98, top: 172 },
};

const ACCESSIBILITY_TEMPLATE: FormTemplateConfig = {
  fileName: "accessibility.pdf",
  expectedPageCount: 2,
  placements: [
    // Header: "אל: רשות רישוי עסקים ______ [שם הרשות המקומית]".
    {
      key: "localAuthority",
      page: 0,
      box: ruledLine(751, 244, 365),
      align: "center",
      size: 10.5,
    },
    // "מס' תיק/בקשה לרישיון עסק ______", above the declarant table.
    { key: "fileNumber", page: 0, box: ruledLine(537, 274, 368), align: "center", size: 10.5 },
    // חלק א' - פרטי המצהיר.
    {
      key: "ownerName",
      page: 0,
      box: { ...ACCESSIBILITY_DECLARANT_COLUMNS.right, ...ACCESSIBILITY_DECLARANT_ROW },
      padding: 6,
    },
    {
      key: "hpNumber",
      page: 0,
      box: { ...ACCESSIBILITY_DECLARANT_COLUMNS.middle, ...ACCESSIBILITY_DECLARANT_ROW },
      padding: 6,
    },
    {
      key: "email",
      page: 0,
      box: { ...ACCESSIBILITY_DECLARANT_COLUMNS.left, ...ACCESSIBILITY_DECLARANT_ROW },
      size: 10,
      padding: 6,
    },
    // חלק ב' - פרטי העסק. The cells are narrow, so values wrap.
    {
      key: "businessName",
      page: 0,
      box: { ...BUSINESS_COLUMNS.name, ...BUSINESS_ROW },
      size: 10,
      padding: 4,
      lines: 2,
    },
    {
      key: "address",
      page: 0,
      box: { ...BUSINESS_COLUMNS.address, ...BUSINESS_ROW },
      size: 10,
      padding: 4,
      lines: 3,
    },
    {
      key: "serialNumber",
      page: 0,
      box: { ...BUSINESS_COLUMNS.serialNumber, ...BUSINESS_ROW },
      size: 10,
      padding: 4,
      lines: 2,
    },
    {
      key: "totalArea",
      page: 0,
      box: { ...BUSINESS_COLUMNS.totalArea, ...BUSINESS_AREA_ROW },
      size: 10,
      padding: 4,
    },
    {
      key: "hpNumber",
      page: 0,
      box: { ...BUSINESS_COLUMNS.hpNumber, ...BUSINESS_ROW },
      size: 10,
      padding: 4,
      lines: 2,
    },
    // חלק ג' - אופציונלי: פרטי מורשה נגישות. Two rows of two cells, labels on
    // the right of each cell and the value written to their left.
    {
      key: "accessibilityConsultantName",
      page: 0,
      box: { left: 320, right: 440, ...CONSULTANT_ROWS.identity },
      size: 10,
      padding: 4,
    },
    {
      key: "accessibilityConsultantId",
      page: 0,
      box: { left: 95, right: 268, ...CONSULTANT_ROWS.identity },
      size: 10,
      padding: 4,
    },
    {
      key: "accessibilityConsultantRegistryNumber",
      page: 0,
      box: { left: 320, right: 380, ...CONSULTANT_ROWS.registry },
      size: 10,
      padding: 4,
    },
    {
      key: "accessibilityConsultantRegistry",
      page: 0,
      box: { left: 95, right: 250, ...CONSULTANT_ROWS.registry },
      size: 10,
      padding: 4,
      lines: 2,
    },
    // חלק ד' - גוף התצהיר: "אני הח"מ, ____, בעל/ת תעודת זהות מספר ____".
    { key: "ownerName", page: 1, box: ruledLine(721, 373, 454), align: "center", size: 10 },
    { key: "hpNumber", page: 1, box: ruledLine(721, 174, 242), align: "center", size: 10 },
    // חלק ה' - אימות התצהיר: the lawyer signs, but the blanks that identify the
    // declarant ("הופיעה בפני גב'/מר ___, בעל ת"ז: ___") are ours.
    { key: "ownerName", page: 1, box: ruledLine(341, 160, 260), align: "center", size: 10 },
    { key: "hpNumber", page: 1, box: ruledLine(320, 393, 487), align: "center", size: 10 },
  ],
};

const ACCESSIBILITY_AFFIDAVIT: AutoFormDefinition = {
  key: "accessibility_affidavit",
  title: "תצהיר נגישות בעסק - לבקשת רישיון או היתר זמני",
  authority: "מחלקת רישוי עסקים - הרשות המקומית",
  subtitle: "תצהיר בעל העסק על התקיימות הוראות הנגישות, לפי סעיף 8ב לחוק רישוי עסקים",
  fileSlug: "accessibility-affidavit",
  intro: (business) =>
    `אני החתום מטה, ${business.ownerName}, נושא ת.ז / ח.פ ${business.hpNumber}, ` +
    `בעל העסק "${business.name}" שכתובתו ${business.address}, מצהיר בזאת כי בעסק ` +
    "מתקיימות הוראות הנגישות החלות עליו, וכי תצהיר זה מוגש לצורך מתן או חידוש " +
    "רישיון עסק.",
  sectionTitle: "נוסח ההצהרה",
  declarations: [
    "בעסק מתקיימות הוראות הנגישות לאנשים עם מוגבלות החלות עליו לפי כל דין.",
    "ההצהרה נסמכת על בדיקתי, ובנושאים מקצועיים על סיוע מורשה נגישות מטעמי.",
    "ידוע ומובן לי שעלי להבטיח את התקיימות הוראות הנגישות בכל עת שניתן שירות בעסק.",
    "לא נמסר לי אישור על יסוד תצהיר שבו נמצאו סייגים שלא תוקנו.",
    "ידוע לי כי מסירת פרטים כוזבים בתצהיר זה מהווה עבירה על החוק.",
  ],
  closing:
    "התצהיר מולא אוטומטית על בסיס פרטי העסק השמורים במערכת. יש להדפיס, לחתום " +
    "ולאמת את התצהיר בפני עורך דין, ולהעלות את המסמך החתום בחזרה למערכת.",
  template: ACCESSIBILITY_TEMPLATE,
};

const OUTDOOR_SEATING_REQUEST: AutoFormDefinition = {
  key: "outdoor_seating_request",
  title: "בקשה להיתר הוצאת שולחנות וכיסאות",
  authority: "מחלקת רישוי עסקים - הרשות המקומית",
  subtitle: "בקשה לשימוש בשטח הציבורי הצמוד לחזית העסק",
  fileSlug: "outdoor-seating-request",
  intro: (business) =>
    `אני החתום מטה, ${business.ownerName}, בעל העסק "${business.name}" ` +
    `(ח.פ / ת.ז ${business.hpNumber}) שכתובתו ${business.address}, מבקש בזאת היתר ` +
    "להוצאת שולחנות וכיסאות בשטח הציבורי הצמוד לעסק, בהתאם לתנאים המפורטים להלן.",
  sectionTitle: "הצהרות המבקש",
  declarations: [
    "השטח המבוקש צמוד לחזית העסק ואינו חוסם מעבר להולכי רגל ברוחב הנדרש בחוק.",
    "לא יוצבו בשטח מבנים קבועים, סככות או מכשירי חימום ללא אישור נפרד.",
    "השולחנות והכיסאות יפונו בתום שעות הפעילות בהתאם להוראות הרשות המקומית.",
    "ידוע לי כי ההיתר מותנה בתשלום אגרה ובקיום תנאי הרישיון של העסק.",
    "ידוע לי כי הרשות המקומית רשאית לבטל את ההיתר בשל הפרת תנאיו.",
  ],
  closing:
    "הבקשה מולאה אוטומטית על בסיס פרטי העסק השמורים במערכת. יש להדפיס, לחתום " +
    "ולהגיש למחלקת רישוי עסקים, ולהעלות את הבקשה החתומה בחזרה למערכת.",
};

/**
 * "נספח - נתונים כלליים של העסק" at the end of the police requirement sheets.
 *
 * All three sheets share the same appendix: two rows of fill-in lines followed by
 * a table whose right column (x 398-533) holds the labels, four columns hold the
 * contact details of the owner (שם 316-397, משפחה 235-315, טלפון 154-235,
 * פלאפון 44-153) and the single value rows use the whole width left of x 397.
 * Only the y positions differ between the sheets - see `scripts/template-lines.mjs`.
 */
const POLICE_COLUMNS = {
  firstName: { left: 316, right: 397 },
  lastName: { left: 235, right: 315 },
  phone: { left: 154, right: 235 },
  mobile: { left: 44, right: 153 },
  wide: { left: 44, right: 397 },
};

/**
 * Columns of the "אמצעי מיגון ואבטחה בעסק" table, which is ticked rather than
 * written in: קיים 316-397, לא קיים 235-315, חלקי 154-235.
 */
const POLICE_SECURITY_COLUMNS: Record<"exists" | "missing" | "partial", { left: number; right: number }> = {
  exists: POLICE_COLUMNS.firstName,
  missing: POLICE_COLUMNS.lastName,
  partial: POLICE_COLUMNS.phone,
};

/** The "הערות" column that closes the same table. */
const POLICE_SECURITY_NOTES_COLUMN = POLICE_COLUMNS.mobile;

type Span = [number, number];
type Row = { bottom: number; top: number };

type PoliceAppendixGeometry = {
  /** Zero-based index of the appendix page. */
  page: number;
  /** The "שם העסק / מספר עובדים / ח״פ" line and the blanks along it. */
  identity: { y: number; businessName: Span; employees: Span; hp: Span };
  /** The "טלפון בעסק / מספר פקס'" line and its blanks. */
  contact: { y: number; phone: Span; fax: Span };
  ownerRow: Row;
  managerRow: Row;
  natureRow: Row;
  /** The three ruled lines under "תיאור כללי של העסק". */
  descriptionRow: Row;
  sizeRow: Row;
  capacityRow: Row;
  /** Rows of the "מספר טלפונים בעלי תפקידים בעסק" table. */
  rolePhoneRow: Row;
  managerPhoneRow: Row;
  shiftPhoneRow: Row;
  securityPhoneRow: Row;
  /** Rows of the "אמצעי מיגון ואבטחה בעסק" table. */
  security: {
    guards: Row;
    fence: Row;
    controlRoom: Row;
    alarm: Row;
    cameras: Row;
  };
};

/**
 * The "מסירת תנאים" clause that closes the requirement sheet: the police officer
 * signs as the one handing the conditions over, and the business owner as the one
 * receiving them. Only the receiving half is ours to fill.
 */
type PoliceConditionsGeometry = {
  page: number;
  /** The "מקבל התנאים" line, with the x centre of each label below it. */
  receiver: { y: number; name: number; id: number };
  /** The date is printed as day / month / year blanks. */
  date: { y: number; day: Span; month: Span; year: Span };
};

/** Clause 7 of item 4.8: the owner declaration that comes with appendix ב'. */
type PoliceDeclarationGeometry = {
  page: number;
  /** The blank inside "אני )______(". */
  name: { y: number; box: Span };
  /** The signature line, with the x centre of the name and id labels below it. */
  signature: { y: number; name: number; id: number };
};

/** A box of the given width, centred on the label it belongs to. */
function centredOn(centre: number, width: number): { left: number; right: number } {
  return { left: centre - width / 2, right: centre + width / 2 };
}

function policeAppendixPlacements(input: {
  appendix: PoliceAppendixGeometry;
  conditions: PoliceConditionsGeometry;
  declaration?: PoliceDeclarationGeometry;
}): TemplatePlacement[] {
  const { appendix, conditions, declaration } = input;
  const { identity, contact } = appendix;

  const onLine = (
    key: FormFieldKey,
    page: number,
    y: number,
    [left, right]: Span,
    size = 9,
  ): TemplatePlacement => ({
    key,
    page,
    box: ruledLine(y, left, right),
    align: "center",
    size,
    padding: 2,
  });

  const inCell = (
    key: FormFieldKey,
    column: { left: number; right: number },
    row: Row,
    padding = 4,
    lines?: number,
  ): TemplatePlacement => ({
    key,
    page: appendix.page,
    box: { ...column, ...row },
    size: 10,
    padding,
    ...(lines ? { lines } : {}),
  });

  /** One tick per answer, in the column that answer belongs to, and the remark. */
  const securityRow = (key: FormFieldKey, row: Row): TemplatePlacement[] => [
    ...(["exists", "missing", "partial"] as const).map<TemplatePlacement>((state) => ({
      key,
      page: appendix.page,
      box: { ...POLICE_SECURITY_COLUMNS[state], ...row },
      align: "center",
      size: 12,
      padding: 2,
      text: "X",
      when: state,
    })),
    {
      key: `${key}Note` as FormFieldKey,
      page: appendix.page,
      box: { ...POLICE_SECURITY_NOTES_COLUMN, ...row },
      size: 8,
      padding: 3,
      lines: 2,
    },
  ];

  return [
    onLine("businessName", appendix.page, identity.y, identity.businessName),
    onLine("employeeCount", appendix.page, identity.y, identity.employees),
    onLine("hpNumber", appendix.page, identity.y, identity.hp),
    onLine("phone", appendix.page, contact.y, contact.phone),
    onLine("fax", appendix.page, contact.y, contact.fax),
    inCell("ownerFirstName", POLICE_COLUMNS.firstName, appendix.ownerRow),
    inCell("ownerLastName", POLICE_COLUMNS.lastName, appendix.ownerRow),
    inCell("phone", POLICE_COLUMNS.phone, appendix.ownerRow),
    inCell("mobile", POLICE_COLUMNS.mobile, appendix.ownerRow),
    inCell("managerFirstName", POLICE_COLUMNS.firstName, appendix.managerRow),
    inCell("managerLastName", POLICE_COLUMNS.lastName, appendix.managerRow),
    inCell("managerPhone", POLICE_COLUMNS.phone, appendix.managerRow),
    inCell("businessDescription", POLICE_COLUMNS.wide, appendix.natureRow, 6),
    inCell("generalDescription", POLICE_COLUMNS.wide, appendix.descriptionRow, 6, 3),
    inCell("totalArea", POLICE_COLUMNS.wide, appendix.sizeRow, 6),
    inCell("maxCapacity", POLICE_COLUMNS.wide, appendix.capacityRow, 6),
    inCell("phone", POLICE_COLUMNS.firstName, appendix.rolePhoneRow),
    inCell("managerPhone", POLICE_COLUMNS.firstName, appendix.managerPhoneRow),
    inCell("shiftManagerPhone", POLICE_COLUMNS.firstName, appendix.shiftPhoneRow),
    inCell("securityPhone", POLICE_COLUMNS.firstName, appendix.securityPhoneRow),
    ...securityRow("securityGuards", appendix.security.guards),
    ...securityRow("securityFence", appendix.security.fence),
    ...securityRow("securityControlRoom", appendix.security.controlRoom),
    ...securityRow("securityAlarm", appendix.security.alarm),
    ...securityRow("securityCameras", appendix.security.cameras),

    {
      key: "ownerName",
      page: conditions.page,
      box: ruledLine(conditions.receiver.y, ...spanOf(centredOn(conditions.receiver.name, 96))),
      align: "center",
      size: 10,
      padding: 2,
    },
    {
      key: "hpNumber",
      page: conditions.page,
      box: ruledLine(conditions.receiver.y, ...spanOf(centredOn(conditions.receiver.id, 84))),
      align: "center",
      size: 10,
      padding: 2,
    },
    onLine("generatedDay", conditions.page, conditions.date.y, conditions.date.day, 10),
    onLine("generatedMonth", conditions.page, conditions.date.y, conditions.date.month, 10),
    onLine("generatedYear", conditions.page, conditions.date.y, conditions.date.year, 10),

    ...(declaration
      ? [
          onLine("ownerName", declaration.page, declaration.name.y, declaration.name.box, 10),
          {
            key: "ownerName" as FormFieldKey,
            page: declaration.page,
            box: ruledLine(declaration.signature.y, ...spanOf(centredOn(declaration.signature.name, 110))),
            align: "center" as const,
            size: 10,
            padding: 2,
          },
          {
            key: "hpNumber" as FormFieldKey,
            page: declaration.page,
            box: ruledLine(declaration.signature.y, ...spanOf(centredOn(declaration.signature.id, 80))),
            align: "center" as const,
            size: 10,
            padding: 2,
          },
        ]
      : []),
  ];
}

function spanOf(box: { left: number; right: number }): Span {
  return [box.left, box.right];
}

/**
 * The requirement sheets themselves are read-only instructions; only the closing
 * appendix is filled in, so each definition maps that single page.
 */
function policeDefinition(input: {
  key: string;
  item: string;
  description: string;
  fileName: string;
  fileSlug: string;
  pageCount: number;
  appendix: PoliceAppendixGeometry;
  conditions: PoliceConditionsGeometry;
  declaration?: PoliceDeclarationGeometry;
}): AutoFormDefinition {
  return {
    key: input.key,
    title: `דרישות משטרה - פריט ${input.item} (${input.description})`,
    authority: "משטרת ישראל - חטיבת אבטחה ורישוי",
    subtitle: "נספח נתונים כלליים של העסק, המצורף לדרישות המשטרה לרישוי",
    fileSlug: input.fileSlug,
    intro: (business) =>
      `נספח נתונים כלליים של העסק "${business.name}" (ח.פ / ת.ז ${business.hpNumber}) ` +
      `שכתובתו ${business.address}, המוגש למשטרת ישראל כחלק מדרישות הרישוי לפריט ` +
      `${input.item}.`,
    sectionTitle: "נתונים כלליים",
    declarations: [
      "הנתונים בנספח נמסרים על ידי בעל העסק או מנהל העסק ומשקפים את מצב העסק בפועל.",
      "כל שינוי בתפוסה, במספר העובדים או באמצעי המיגון יעודכן ויימסר לגורם הרישוי.",
      "ידוע לי כי אישור המשטרה מותנה בעמידה בדרישות המפורטות במסמך הדרישות.",
    ],
    closing:
      "הנספח מולא אוטומטית על בסיס פרטי העסק השמורים במערכת. יש להדפיס, להשלים את " +
      "יתר הסעיפים בנספח, לחתום ולהעלות את המסמך החתום בחזרה למערכת.",
    template: {
      fileName: input.fileName,
      expectedPageCount: input.pageCount,
      placements: policeAppendixPlacements(input),
    },
  };
}

const POLICE_4_2A = policeDefinition({
  key: "police_4_2a",
  item: "4.2א",
  description: "בית קפה / מסעדה",
  fileName: "police-4-2a.pdf",
  fileSlug: "police-4-2a",
  pageCount: 4,
  appendix: {
    page: 3,
    identity: { y: 747, businessName: [335, 386], employees: [238, 279], hp: [156, 202] },
    contact: { y: 731, phone: [291, 352], fax: [188, 243] },
    ownerRow: { bottom: 666, top: 688 },
    managerRow: { bottom: 644, top: 666 },
    natureRow: { bottom: 632, top: 644 },
    descriptionRow: { bottom: 550, top: 612 },
    sizeRow: { bottom: 530, top: 550 },
    capacityRow: { bottom: 509, top: 530 },
    rolePhoneRow: { bottom: 468, top: 488 },
    managerPhoneRow: { bottom: 447, top: 468 },
    shiftPhoneRow: { bottom: 427, top: 447 },
    securityPhoneRow: { bottom: 406, top: 427 },
    security: {
      guards: { bottom: 333, top: 364 },
      fence: { bottom: 312, top: 333 },
      controlRoom: { bottom: 289, top: 312 },
      alarm: { bottom: 268, top: 289 },
      cameras: { bottom: 246, top: 268 },
    },
  },
  conditions: {
    page: 2,
    receiver: { y: 366, name: 371, id: 284 },
    date: { y: 312, day: [345, 375], month: [379, 409], year: [413, 468] },
  },
});

const POLICE_4_2B = policeDefinition({
  key: "police_4_2b",
  item: "4.2ב",
  description: "מזנון / בית אוכל אחר",
  fileName: "police-4-2b.pdf",
  fileSlug: "police-4-2b",
  pageCount: 4,
  appendix: {
    page: 3,
    identity: { y: 726, businessName: [335, 386], employees: [238, 279], hp: [156, 202] },
    contact: { y: 704, phone: [291, 351], fax: [188, 243] },
    ownerRow: { bottom: 640, top: 662 },
    managerRow: { bottom: 618, top: 640 },
    natureRow: { bottom: 606, top: 618 },
    descriptionRow: { bottom: 524, top: 585 },
    sizeRow: { bottom: 503, top: 524 },
    capacityRow: { bottom: 483, top: 503 },
    rolePhoneRow: { bottom: 442, top: 462 },
    managerPhoneRow: { bottom: 422, top: 442 },
    shiftPhoneRow: { bottom: 401, top: 422 },
    securityPhoneRow: { bottom: 381, top: 401 },
    security: {
      guards: { bottom: 308, top: 338 },
      fence: { bottom: 286, top: 308 },
      controlRoom: { bottom: 264, top: 286 },
      alarm: { bottom: 242, top: 264 },
      cameras: { bottom: 220, top: 242 },
    },
  },
  conditions: {
    page: 2,
    receiver: { y: 307, name: 400, id: 295 },
    date: { y: 235, day: [342, 372], month: [376, 407], year: [411, 465] },
  },
});

const POLICE_4_8 = policeDefinition({
  key: "police_4_8",
  item: "4.8",
  description: "משקאות משכרים",
  fileName: "police-4-8.pdf",
  fileSlug: "police-4-8",
  pageCount: 9,
  appendix: {
    page: 8,
    identity: { y: 745, businessName: [343, 404], employees: [227, 275], hp: [128, 183] },
    contact: { y: 733, phone: [290, 363], fax: [166, 233] },
    ownerRow: { bottom: 642, top: 668 },
    managerRow: { bottom: 615, top: 642 },
    natureRow: { bottom: 589, top: 615 },
    descriptionRow: { bottom: 491, top: 564 },
    sizeRow: { bottom: 467, top: 491 },
    capacityRow: { bottom: 442, top: 467 },
    rolePhoneRow: { bottom: 393, top: 418 },
    managerPhoneRow: { bottom: 369, top: 393 },
    shiftPhoneRow: { bottom: 344, top: 369 },
    securityPhoneRow: { bottom: 320, top: 344 },
    security: {
      guards: { bottom: 246, top: 283 },
      fence: { bottom: 220, top: 246 },
      controlRoom: { bottom: 194, top: 220 },
      alarm: { bottom: 168, top: 194 },
      cameras: { bottom: 141, top: 168 },
    },
  },
  conditions: {
    page: 3,
    receiver: { y: 613, name: 400, id: 291 },
    date: { y: 577, day: [345, 375], month: [379, 409], year: [413, 468] },
  },
  declaration: {
    page: 7,
    name: { y: 757, box: [355, 482] },
    signature: { y: 643, name: 432, id: 310 },
  },
});

const DEFINITIONS: Record<string, AutoFormDefinition> = {
  [FIRE_SAFETY_DECLARATION.key]: FIRE_SAFETY_DECLARATION,
  [ACCESSIBILITY_AFFIDAVIT.key]: ACCESSIBILITY_AFFIDAVIT,
  [POLICE_4_2A.key]: POLICE_4_2A,
  [POLICE_4_2B.key]: POLICE_4_2B,
  [POLICE_4_8.key]: POLICE_4_8,
  [OUTDOOR_SEATING_REQUEST.key]: OUTDOOR_SEATING_REQUEST,
};

export function getFormDefinition(generatorKey: string): AutoFormDefinition | null {
  return DEFINITIONS[generatorKey] ?? null;
}

/**
 * Official forms ask for the first and last name in separate boxes, so the
 * stored owner name is split on the first space.
 */
export function resolveFormFieldValues(
  business: FormBusinessDetails,
  generatedAt: Date,
): Record<FormFieldKey, string> {
  const nameParts = business.ownerName.trim().split(/\s+/).filter(Boolean);
  const approvals = (business.professionalApprovals ?? []).filter(Boolean);
  const managerParts = (business.managerName ?? "").trim().split(/\s+/).filter(Boolean);
  const measures = business.securityMeasures;
  const notes = business.securityNotes;
  // "unknown" leaves the row blank, so a business that has not answered yet does
  // not accidentally declare a missing measure.
  const measure = (state: SecurityState | undefined) => (state && state !== "unknown" ? state : "");
  // A corporate signatory prints the company name and number on the same line.
  const corporateDetails =
    business.declarerRole === "corporate_signatory"
      ? `${business.name}, ח.פ ${business.hpNumber}`
      : "";

  return {
    businessName: business.name,
    address: business.address,
    hpNumber: business.hpNumber,
    ownerName: business.ownerName,
    ownerFirstName: nameParts[0] ?? "",
    ownerLastName: nameParts.slice(1).join(" "),
    phone: business.phone,
    email: business.email ?? "",
    serialNumber: business.serialNumber ?? "",
    fileNumber: business.fileNumber ?? "",
    localAuthority: business.localAuthority?.trim() || extractLocalAuthority(business.address),
    businessDescription: business.businessDescription ?? "",
    totalArea: business.totalArea ?? "",
    builtArea: business.builtArea ?? "",
    maxCapacity: business.maxCapacity ?? "",
    employeeCount: business.employeeCount ?? "",
    mobile: business.mobile ?? "",
    fax: business.fax ?? "",
    managerName: business.managerName ?? "",
    managerFirstName: managerParts[0] ?? "",
    managerLastName: managerParts.slice(1).join(" "),
    managerPhone: business.managerPhone ?? "",
    shiftManagerPhone: business.shiftManagerPhone ?? "",
    securityPhone: business.securityPhone ?? "",
    generalDescription: business.generalDescription ?? "",
    corporateDetails,
    declarerRole: business.declarerRole ?? "owner",
    securityGuards: measure(measures?.guards),
    securityFence: measure(measures?.fence),
    securityControlRoom: measure(measures?.controlRoom),
    securityAlarm: measure(measures?.alarm),
    securityCameras: measure(measures?.cameras),
    securityGuardsNote: notes?.guards ?? "",
    securityFenceNote: notes?.fence ?? "",
    securityControlRoomNote: notes?.controlRoom ?? "",
    securityAlarmNote: notes?.alarm ?? "",
    securityCamerasNote: notes?.cameras ?? "",
    accessibilityConsultantName: business.accessibilityConsultantName ?? "",
    accessibilityConsultantId: business.accessibilityConsultantId ?? "",
    accessibilityConsultantRegistry: business.accessibilityConsultantRegistry ?? "",
    accessibilityConsultantRegistryNumber: business.accessibilityConsultantRegistryNumber ?? "",
    approval1: approvals[0] ?? "",
    approval2: approvals[1] ?? "",
    approval3: approvals[2] ?? "",
    approval4: approvals[3] ?? "",
    generatedDate: generatedAt.toLocaleDateString("he-IL"),
    // Forms that print the date as three separate blanks.
    generatedDay: String(generatedAt.getDate()).padStart(2, "0"),
    generatedMonth: String(generatedAt.getMonth() + 1).padStart(2, "0"),
    generatedYear: String(generatedAt.getFullYear()),
  };
}

export const AUTO_FORM_KEYS = Object.keys(DEFINITIONS);
