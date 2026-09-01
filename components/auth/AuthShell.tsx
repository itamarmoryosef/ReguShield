import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-gray-900">ReguShield</span>
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-panel animate-fade-in-up sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">{subtitle}</p>
          {children}
        </div>

        <div className="mt-5 text-center text-sm text-gray-500">{footer}</div>
      </div>
    </div>
  );
}
