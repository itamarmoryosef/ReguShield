import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getCurrentBusiness, getTemplates } from "@/lib/data";

export const metadata = {
  title: "הקמת חשבון | ReguShield",
};

export default async function OnboardingPage() {
  const [templates, business] = await Promise.all([getTemplates(), getCurrentBusiness()]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-gray-900">
                ReguShield
              </span>
              <span className="block text-xs text-gray-500">הקמת חשבון</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <X className="h-3.5 w-3.5" />
            יציאה
          </Link>
        </div>
      </header>

      <OnboardingWizard templates={templates} businessId={business?.id ?? null} />
    </div>
  );
}
