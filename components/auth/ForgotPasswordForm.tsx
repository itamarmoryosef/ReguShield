"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { firstZodMessage } from "@/lib/validation/parse";
import { emailSchema } from "@/lib/validation/schemas";

export function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setError(null);
    setPending(true);
    try {
      // Redirects on success, so `pending` intentionally stays true.
      await requestPasswordReset(formData);
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

      <TextField
        label="דוא״ל"
        name="email"
        type="email"
        defaultValue={defaultEmail}
        placeholder="name@restaurant.co.il"
        autoComplete="email"
        required
        disabled={pending}
        hint="נשלח קישור לאיפוס הסיסמה לכתובת הזו."
      />

      <Button type="submit" size="md" variant="primary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "שולח..." : "שליחת קישור לאיפוס"}
      </Button>
    </form>
  );
}
