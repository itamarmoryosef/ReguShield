/**
 * Shrinks an upload in the browser before it is sent.
 *
 * Two hard ceilings sit between the camera and the scanner: a server action
 * body defaults to 1 MB, and a Vercel function refuses a request body over
 * 4.5 MB. Base64 adds a third on top of the file size. A phone photo is
 * routinely 3-5 MB, so without this step the ordinary case — point the camera
 * at a permit — fails on the limit rather than on anything the user did.
 *
 * Downscaling also cuts what we pay per scan, since the model is billed on
 * image tokens and a 4000px photo of an A4 page carries no more readable text
 * than a 2000px one.
 */

/** Enough to read the small print on a stamped A4 permit. */
const MAX_EDGE = 2200;

/** Leaves room for base64 inflation under the 4.5 MB request ceiling. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export type PreparedFile = {
  /** Data URL, ready for both the scanner and storage. */
  dataUrl: string;
  mimeType: string;
  fileName: string;
  /** True when the image was re-encoded, so the preview can be trusted. */
  isImage: boolean;
};

export class UploadTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`הקובץ גדול מדי. הגבול הוא ${Math.round(limitBytes / (1024 * 1024))}MB.`);
    this.name = "UploadTooLargeError";
  }
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}

/**
 * Re-encodes an image so its longest edge is at most `MAX_EDGE`.
 *
 * Quality is stepped down only while the result is still too big, so a small
 * photo keeps its original detail instead of being degraded for no reason.
 */
async function downscaleImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return fileToDataUrl(file);
  }

  // A permit photographed against a dark surface keeps its own background;
  // white only fills the padding of a transparent PNG being flattened to JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(dataUrl) <= MAX_UPLOAD_BYTES) return dataUrl;
  }

  return canvas.toDataURL("image/jpeg", 0.45);
}

/** Decoded size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function prepareUpload(file: File): Promise<PreparedFile> {
  const isImage = file.type.startsWith("image/");

  if (isImage) {
    const dataUrl = await downscaleImage(file);
    return {
      dataUrl,
      mimeType: "image/jpeg",
      // The bytes are JPEG now, so the name must not still claim otherwise.
      fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
      isImage: true,
    };
  }

  // A PDF cannot be re-encoded here, so an oversized one is refused with a
  // reason rather than failing later as an opaque network error.
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadTooLargeError(MAX_UPLOAD_BYTES);
  }

  return {
    dataUrl: await fileToDataUrl(file),
    mimeType: file.type || "application/pdf",
    fileName: file.name,
    isImage: false,
  };
}
