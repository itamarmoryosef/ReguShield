"use client";

import { Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { getDocumentSignedUrl } from "@/app/actions/documents";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

export function ViewDocumentButton({ documentId }: { documentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDocument() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await getDocumentSignedUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={openDocument}
      disabled={busy}
      title={error ?? "צפייה מאובטחת במסמך"}
      aria-label="צפייה מאובטחת במסמך"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
      צפייה
    </Button>
  );
}
