"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const BUCKET = "partner-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

type LogoUploadFieldProps = {
  /** Storage writes are scoped to this folder by the bucket policy. */
  partnerId: string;
  value: string;
  onChange: (url: string) => void;
  demo?: boolean;
  disabled?: boolean;
};

export function LogoUploadField({
  partnerId,
  value,
  onChange,
  demo,
  disabled,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    // Checked here as well as in the bucket, so a mistake costs no upload.
    if (!ACCEPTED.includes(file.type)) {
      setError("אפשר להעלות רק תמונות: JPG, PNG, WEBP או SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("הקובץ גדול מ-2MB. נסו תמונה קטנה יותר.");
      return;
    }

    if (demo) {
      onChange(URL.createObjectURL(file));
      return;
    }

    setUploading(true);
    try {
      // Imported on demand: the Supabase browser client is ~100kB, and nobody
      // should pay for it just to open the settings page.
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${partnerId}/logo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError("העלאת הלוגו נכשלה. נסו שוב.");
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">לוגו המשרד</span>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {value ? (
            // Any partner-supplied host is possible here, so the plain img tag
            // avoids having to allowlist domains for next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="לוגו המשרד" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-gray-400" />
          )}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {uploading ? "מעלה..." : value ? "החלפת לוגו" : "העלאת לוגו"}
          </Button>

          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || uploading}
              onClick={() => {
                onChange("");
                setError(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              הסרה
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">PNG, JPG, WEBP או SVG, עד 2MB.</p>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
