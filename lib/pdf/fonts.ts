import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

export type FormFontBytes = { regular: Uint8Array; bold: Uint8Array };

let cache: FormFontBytes | null = null;

/**
 * David Libre is the Hebrew face used for every generated form. The TTFs are
 * read from disk once per server instance and reused for all documents.
 */
export async function loadFormFonts(): Promise<FormFontBytes> {
  if (cache) return cache;

  try {
    const [regular, bold] = await Promise.all([
      readFile(path.join(FONT_DIR, "DavidLibre-Regular.ttf")),
      readFile(path.join(FONT_DIR, "DavidLibre-Bold.ttf")),
    ]);
    cache = { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
    return cache;
  } catch (error) {
    throw new AppError("לא נמצאו קבצי הגופן העברי ליצירת הטופס", {
      code: "PDF_FONT_MISSING",
      status: 500,
      cause: error,
    });
  }
}
