"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import type { UserRole } from "@/lib/types";
import { firstZodMessage, formDataToRecord } from "@/lib/validation/parse";
import { liveSignInSchema, signInSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { RoleToggle } from "./RoleToggle";

export function LoginForm({ demo }: { demo: boolean }) {
  const [role, setRole] = useState<UserRole>("business");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    const schema = demo ? signInSchema : liveSignInSchema;
    const parsed = schema.safeParse(formDataToRecord(formData));
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setError(null);
    setPending(true);
    try {
      // Redirects on success, so `pending` intentionally stays true.
      await signIn(formData);
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
      <TextField
        label="סיסמה"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        required={!demo}
        disabled={pending}
      />

      <Button type="submit" size="md" variant="primary" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
        {pending ? "מתחבר..." : "התחבר"}
      </Button>
    </form>
  );
}
