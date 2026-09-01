import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  demo?: boolean;
};

export function AppHeader({ title, subtitle, demo }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-gray-900">
              ReguShield
            </span>
            <span className="block truncate text-xs text-gray-500">{title}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {demo ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              מצב הדגמה
            </span>
          ) : null}
          {subtitle ? (
            <span className="hidden max-w-[200px] truncate text-xs text-gray-500 sm:block">
              {subtitle}
            </span>
          ) : null}
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              יציאה
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
