import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isDemoMode } from "@/lib/env";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string; sent?: string; error?: string };
}) {
  const demo = isDemoMode();
  const email = searchParams?.email ?? "";

  if (searchParams?.sent) {
    return (
      <AuthShell
        title="בדקו את הדוא״ל"
        subtitle="שלחנו לכם קישור לאיפוס הסיסמה"
        footer={
          <>
            נזכרתם בסיסמה?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              חזרה להתחברות
            </Link>
          </>
        }
      >
        <div className="mb-5 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MailCheck className="h-6 w-6" />
          </span>
        </div>

        {/* Worded so it reveals nothing about whether the address is registered. */}
        <p className="text-center text-sm leading-relaxed text-gray-700">
          אם קיים חשבון בכתובת הזו, ישלח אליה קישור לבחירת סיסמה חדשה.
        </p>

        {email ? (
          <p className="mt-2 text-center text-sm font-medium text-gray-900" dir="ltr">
            {email}
          </p>
        ) : null}

        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
          לא הגיע? בדקו בתיקיית הספאם או הקידומים. הקישור תקף לשעה אחת, ואפשר לבקש חדש
          פעם בדקה.
        </p>

        {demo ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
            מצב הדגמה: לא נשלח מייל אמיתי.
          </p>
        ) : null}

        <div className="mt-5">
          <Link
            href={`/forgot-password?email=${encodeURIComponent(email)}`}
            className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            שליחה שוב או שינוי הכתובת
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="שחזור סיסמה"
      subtitle="נשלח לכם קישור לבחירת סיסמה חדשה"
      footer={
        <>
          נזכרתם בסיסמה?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            חזרה להתחברות
          </Link>
        </>
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
          מצב הדגמה: לא נשלח מייל אמיתי.
        </p>
      ) : null}

      <ForgotPasswordForm defaultEmail={email} />
    </AuthShell>
  );
}
