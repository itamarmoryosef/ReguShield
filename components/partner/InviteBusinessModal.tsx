"use client";

import { Check, Copy, Link2, Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";

const inviteSchema = z.object({
  businessName: z.string().trim().min(2, "יש למלא שם עסק"),
  contact: z
    .string()
    .trim()
    .min(9, "יש למלא דוא״ל או טלפון של בעל העסק")
    .refine(
      (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || /^[0-9+\-() ]{9,20}$/.test(value),
      "יש להזין דוא״ל תקין או מספר טלפון",
    ),
});

type InviteBusinessModalProps = {
  open: boolean;
  onClose: () => void;
};

export function InviteBusinessModal({ open, onClose }: InviteBusinessModalProps) {
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<{ businessName?: string; contact?: string }>({});
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setBusinessName("");
    setContact("");
    setErrors({});
    setInviteUrl(null);
    setCopied(false);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function generateInvite() {
    const parsed = inviteSchema.safeParse({ businessName, contact });
    if (!parsed.success) {
      const next: { businessName?: string; contact?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "businessName" && !next.businessName) next.businessName = issue.message;
        if (key === "contact" && !next.contact) next.contact = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);
    // Mock backend: a real invite token will be issued by Supabase tomorrow.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setInviteUrl(`regushield.com/invite/${mockToken()}`);
    setBusy(false);
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(`https://${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={inviteUrl ? "ההזמנה מוכנה" : "הוספת עסק חדש"}
      description={
        inviteUrl
          ? "שלחו את הקישור לבעל העסק. בפתיחתו הוא ישלים פרטים ויקושר למשרד שלכם."
          : "צרו קישור הזמנה אישי לבעל העסק. הוא יגדיר סיסמה וייכנס אוטומטית לתיק שלכם."
      }
      badge={
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          <Sparkles className="h-3 w-3" />
          קישור קסם
        </span>
      }
    >
      {inviteUrl ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Link2 className="h-3.5 w-3.5" />
              קישור ההזמנה
            </p>
            <p dir="ltr" className="break-all rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-800">
              {inviteUrl}
            </p>
            <Button size="md" variant="outline" onClick={copyLink} className="mt-2.5 w-full">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "הקישור הועתק" : "העתקה ללוח"}
            </Button>
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">שם העסק</dt>
              <dd className="font-medium text-gray-900">{businessName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">איש קשר</dt>
              <dd dir="ltr" className="font-medium text-gray-900">
                {contact}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="md" variant="primary" onClick={close} className="flex-1">
              סיום
            </Button>
            <Button size="md" variant="outline" onClick={reset}>
              הזמנה נוספת
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <TextField
            label="שם העסק"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="מסעדת הים התיכון"
            disabled={busy}
            error={errors.businessName}
          />
          <TextField
            label="דוא״ל או טלפון של בעל העסק"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="owner@restaurant.co.il"
            disabled={busy}
            error={errors.contact}
            hint="הקישור יישלח לכתובת או למספר הזה"
          />
          <Button
            size="md"
            variant="primary"
            onClick={generateInvite}
            disabled={busy}
            className="w-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "יוצר קישור..." : "יצירת קישור הזמנה"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function mockToken(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
