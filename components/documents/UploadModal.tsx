"use client";

import { Camera, CheckCircle2, FileUp, Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { saveScannedDocument } from "@/app/actions/documents";
import { scanDocument } from "@/app/actions/scan-document";
import { toUserMessage } from "@/lib/errors";
import type { DashboardDocument, ScanDocumentResult } from "@/lib/types";
import { scanDocumentInputSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type UploadModalProps = {
  open: boolean;
  item: DashboardDocument | null;
  businessId: string;
  onClose: () => void;
};

export function UploadModal({ open, item, businessId, onClose }: UploadModalProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanDocumentResult | null>(null);

  if (!open || !item) return null;

  async function handleFile(file: File) {
    if (!item) return;

    const currentItem = item;
    setError(null);
    setResult(null);
    setBusy(true);

    try {
      const base64 = await fileToBase64(file);
      setPreview(file.type.startsWith("image/") ? base64 : null);

      const payload = scanDocumentInputSchema.parse({
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
      const scan = await scanDocument(payload);
      setResult(scan);

      await saveScannedDocument({
        businessId,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        scan,
        fallbackTemplateId: currentItem.id,
      });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item.name}
      description="צלמו את המסמך או העלו קובץ. המערכת תזהה את סוג האישור ותחלץ את תאריכי התוקף."
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          <Sparkles className="h-3 w-3" />
          סריקת AI
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="md"
          variant="primary"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          מצלמה
        </Button>
        <Button size="md" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileUp className="h-4 w-4" />
          קובץ / PDF
        </Button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {busy ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          סורק את המסמך ומחלץ תאריכים...
        </p>
      ) : null}

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="תצוגה מקדימה"
          className="mt-4 max-h-44 w-full rounded-xl border border-gray-200 object-cover"
        />
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5 animate-fade-in">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {result.template_name ?? "לא זוהה סוג מסמך"}
          </p>
          <dl className="mt-2.5 space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">תאריך הנפקה</dt>
              <dd className="font-medium text-gray-900">{result.issue_date ?? "לא זוהה"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">תוקף עד</dt>
              <dd className="font-medium text-gray-900">{result.expiry_date ?? "לא זוהה"}</dd>
            </div>
          </dl>
          <p className="mt-2.5 border-t border-gray-200 pt-2.5 text-[11px] leading-relaxed text-gray-500">
            {result.notes}
          </p>
          <Button size="md" variant="primary" onClick={onClose} className="mt-3 w-full">
            סיום
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}
