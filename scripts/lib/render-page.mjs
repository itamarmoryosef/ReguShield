import { readFile } from "node:fs/promises";
import { PDFiumLibrary } from "@hyzyla/pdfium";

/**
 * Rasterises a PDF page with pdfium (WASM). pdf.js + a native canvas crashes on
 * some of the government templates, so every dev tool that needs pixels goes
 * through here.
 *
 * Returns RGBA pixels plus the page size in PDF points, so pixel positions can
 * be converted back into placement coordinates.
 */
export async function renderPage(file, pageNumber, scale) {
  const library = await PDFiumLibrary.init();

  try {
    const document = await library.loadDocument(await readFile(file));
    const page = document.getPage(pageNumber - 1);
    const bitmap = await page.render({ scale, render: "bitmap" });

    // pdfium hands back BGRA; swap the channels in place for canvas/PNG use.
    const data = Buffer.from(bitmap.data);
    for (let i = 0; i < data.length; i += 4) {
      const blue = data[i];
      data[i] = data[i + 2];
      data[i + 2] = blue;
    }

    const result = {
      data,
      width: bitmap.width,
      height: bitmap.height,
      pageWidth: bitmap.width / scale,
      pageHeight: bitmap.height / scale,
    };

    document.destroy();
    return result;
  } finally {
    library.destroy();
  }
}
