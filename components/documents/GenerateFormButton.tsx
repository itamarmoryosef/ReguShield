"use client";

import { Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { generateFormPdf } from "@/app/actions/generate-pdf";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

type GenerateFormButtonProps = {
  businessId: string;
  templateId: string;
  label: string;
  variant?: "primary" | "outline";
  className?: string;
  onGenerated: () => void;
  onError: (message: string | null) => void;
};

export function GenerateFormButton({
  businessId,
  templateId,
  label,
  variant = "primary",
  className,
  onGenerated,
  onError,
}: GenerateFormButtonProps) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    onError(null);
    try {
      const form = await generateFormPdf({ businessId, templateId });
      downloadBase64Pdf(form.base64, form.fileName);
      onGenerated();
    } catch (err) {
      onError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={generate} disabled={busy} className={className}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wand2 className="h-3.5 w-3.5" />
      )}
      {busy ? "יוצר טופס..." : label}
    </Button>
  );
}

function downloadBase64Pdf(base64: string, fileName: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
