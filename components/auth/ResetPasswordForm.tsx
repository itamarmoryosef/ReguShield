"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { firstZodMessage, formDataToRecord } from "@/lib/validation/parse";
import { resetPasswordSchema } from "@/lib/validation/schemas";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const parsed = resetPasswordSchema.safeParse(formDataToRecord(formData));
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setError(null);
    setPending(true);
    try {
      // Redirects on success, so `pending` intentionally stays true.
      await updatePassword(formData);
    } catch (err) {
      setPending(false);
      throw err;
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <PasswordField
        label="סיסמה חדשה"
        name="password"
        placeholder="לפחות 6 תווים"
        autoComplete="new-password"
        required
        disabled={pending}
      />

      <PasswordField
        label="אימות הסיסמה החדשה"
        name="confirm_password"
        placeholder="הקלידו שוב את הסיסמה"
        autoComplete="new-password"
        required
        disabled={pending}
      />

      <Button type="submit" size="md" variant="primary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {pending ? "מעדכן..." : "שמירת הסיסמה והמשך"}
      </Button>
    </form>
  );
}
