"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import type { UserRole } from "@/lib/types";
import { firstZodMessage, formDataToRecord } from "@/lib/validation/parse";
import { liveSignUpSchema, signUpSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { RoleToggle } from "./RoleToggle";

export function SignupForm({ demo }: { demo: boolean }) {
  const [role, setRole] = useState<UserRole>("business");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const schema = demo ? signUpSchema : liveSignUpSchema;
    const parsed = schema.safeParse(formDataToRecord(formData));
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setError(null);
    setPending(true);
    try {
      // Redirects on success, so `pending` intentionally stays true.
      await signUp(formData);
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

      <RoleToggle value={role} onChange={setRole} disabled={pending} />

      <TextField
        label="דוא״ל"
        name="email"
        type="email"
        placeholder="name@restaurant.co.il"
        autoComplete="email"
        required={!demo}
        disabled={pending}
      />
      <PasswordField
        label="סיסמה"
        name="password"
        placeholder="לפחות 6 תווים"
        autoComplete="new-password"
        required={!demo}
        disabled={pending}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="שם מלא" name="full_name" placeholder="ישראל ישראלי" disabled={pending} />
        <TextField
          label={role === "partner" ? "שם המשרד" : "שם העסק"}
          name="organization"
          placeholder={role === "partner" ? "רגולשילד ייעוץ" : "מסעדת הים התיכון"}
          disabled={pending}
        />
      </div>

      {role === "business" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="ח.פ / ת.ז" name="hp_number" placeholder="514000001" disabled={pending} />
          <TextField
            label="כתובת"
            name="address"
            placeholder="דיזנגוף 101, תל אביב"
            disabled={pending}
          />
        </div>
      ) : null}

      <Button type="submit" size="md" variant="primary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "יוצר חשבון..." : "התחל חינם"}
      </Button>
    </form>
  );
}
