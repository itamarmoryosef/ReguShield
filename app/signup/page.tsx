import { Rocket } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { isDemoMode } from "@/lib/env";

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const demo = isDemoMode();

  return (
    <AuthShell
      title="פתיחת חשבון"
      subtitle="14 יום ניסיון, בלי כרטיס אשראי"
      footer={
        <>
          כבר יש לכם חשבון?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            התחברות
          </Link>
        </>
      }
    >
      {searchParams?.error ? (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      {demo ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
          מצב הדגמה: ההרשמה מדלגת על אימות ומעבירה ישירות ללוח הבקרה.
        </p>
      ) : null}

      <SignupForm demo={demo} />

      <Link
        href="/onboarding"
        className="mt-5 flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-3 transition-colors hover:bg-brand-100/70"
      >
        <Rocket className="h-4 w-4 shrink-0 text-brand-600" />
        <span className="text-xs leading-relaxed text-brand-900">
          <span className="font-semibold">מעדיפים ליווי צעד אחר צעד?</span> הצטרפו דרך אשף
          ההקמה - פרטי העסק, בחירת דרישות ומסלול, הכול במקום אחד.
        </span>
      </Link>
    </AuthShell>
  );
}
