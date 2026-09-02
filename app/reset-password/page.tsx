import { KeyRound, LinkIcon } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// The recovery session is read on every visit, so nothing here may be cached.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const demo = isDemoMode();

  // Reaching this page means the recovery link already opened a session. Without
  // one there is nothing to update, and the form would only fail on submit.
  let signedIn = demo;
  if (!demo) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  if (!signedIn) {
    return (
      <AuthShell
        title="הקישור אינו בתוקף"
        subtitle="קישורי שחזור תקפים לשעה אחת"
        footer={
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            חזרה להתחברות
          </Link>
        }
      >
        <div className="mb-5 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <LinkIcon className="h-6 w-6" />
          </span>
        </div>

        <p className="text-center text-sm leading-relaxed text-gray-700">
          לא הצלחנו לזהות בקשת שחזור פעילה. ייתכן שהקישור פג או שנעשה בו שימוש.
        </p>

        <Link
          href="/forgot-password"
          className="mt-5 block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          בקשת קישור חדש
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="בחירת סיסמה חדשה"
      subtitle="עוד רגע ואתם בפנים"
      footer={
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          חזרה להתחברות
        </Link>
      }
    >
      <div className="mb-5 flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <KeyRound className="h-6 w-6" />
        </span>
      </div>

      {searchParams?.error ? (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      {demo ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
          מצב הדגמה: הסיסמה לא נשמרת בפועל.
        </p>
      ) : null}

      <ResetPasswordForm />
    </AuthShell>
  );
}
