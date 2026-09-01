import { Palette } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PartnerBrandingForm } from "@/components/partner/PartnerBrandingForm";
import { PartnerTabs } from "@/components/partner/PartnerTabs";
import { getCurrentPartner, getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

// Renders one partner's own branding, so it must never be cached and served to
// another.
export const dynamic = "force-dynamic";

export default async function PartnerSettingsPage() {
  const demo = isDemoMode();
  const [profile, partner] = await Promise.all([getCurrentProfile(), getCurrentPartner()]);

  if (!demo && profile?.role !== "partner") {
    redirect("/business");
  }

  if (!partner) {
    redirect(demo ? "/partner" : "/login");
  }

  return (
    <>
      <AppHeader title="הגדרות שותף" subtitle={partner.name} demo={demo} isAdmin={profile?.is_admin} />
      <div className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <PartnerTabs />

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">הגדרות</h1>
          <p className="mt-1 text-sm text-gray-500">
            המיתוג שלכם מחליף את המיתוג שלנו בכל מה שהלקוחות רואים.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Palette className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-gray-900">מיתוג שותף</h2>
              <p className="text-xs text-gray-500">לוגו, שם מותג ונוסח תזכורות משלכם.</p>
            </div>
          </div>

          <PartnerBrandingForm
            partnerId={partner.id}
            initial={{
              brand_name: profile?.brand_name ?? "",
              brand_logo_url: profile?.brand_logo_url ?? "",
              custom_reminder_text: profile?.custom_reminder_text ?? "",
            }}
            demo={demo}
          />
        </section>
      </div>
    </>
  );
}
