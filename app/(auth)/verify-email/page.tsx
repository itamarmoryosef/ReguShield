import { CheckCircle2, MailCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { resendVerificationEmail } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { isDemoMode } from "@/lib/env";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { email?: string; sent?: string; error?: string };
}) {
  const email = searchParams?.email ?? "";
  const demo = isDemoMode();

  return (
    <AuthShell
      title="אימות כתובת הדוא״ל"
      subtitle="שלב אחרון לפני שנתחיל"
      footer={
        <>
          נזכרתם שיש לכם חשבון?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            התחברות
          </Link>
        </>
      }
    >
      <div className="mb-5 flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck className="h-6 w-6" />
        </span>
      </div>

      <p className="text-center text-sm leading-relaxed text-gray-700">
        שלחנו לך קישור אימות למייל. אנא לחץ עליו כדי להפעיל את החשבון.
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

      {searchParams?.sent ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          הקישור נשלח שוב.
        </p>
      ) : null}

      {searchParams?.error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      {demo ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
          מצב הדגמה: לא נשלח מייל אמיתי.
        </p>
      ) : null}

      <form action={resendVerificationEmail} className="mt-5">
        <input type="hidden" name="email" value={email} />
        <Button type="submit" size="md" variant="outline" className="w-full">
          <RefreshCw className="h-4 w-4" />
          שליחת הקישור מחדש
        </Button>
      </form>
    </AuthShell>
  );
}
