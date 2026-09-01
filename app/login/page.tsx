import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { isDemoMode } from "@/lib/env";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const demo = isDemoMode();

  return (
    <AuthShell
      title="התחברות"
      subtitle="ניהול רגולציה ורישוי עסקים באפס מאמץ"
      footer={
        <>
          אין לכם חשבון?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            התחל חינם
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
          מצב הדגמה פעיל: אין צורך בפרטים אמיתיים. בחרו סוג חשבון ולחצו התחבר.
        </p>
      ) : null}

      <LoginForm demo={demo} />
    </AuthShell>
  );
}
