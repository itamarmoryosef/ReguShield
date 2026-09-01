import { redirect } from "next/navigation";
import { BusinessTabs } from "@/components/business/BusinessTabs";
import { TemplateChecklist } from "@/components/documents/TemplateChecklist";
import { AppHeader } from "@/components/layout/AppHeader";
import { getBusinessChecklist, getCurrentBusiness, getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export default async function BusinessSettingsPage() {
  const demo = isDemoMode();
  const [profile, business] = await Promise.all([getCurrentProfile(), getCurrentBusiness()]);

  if (!demo && profile?.role === "partner") {
    redirect("/partner");
  }

  if (!business) {
    redirect(demo ? "/business" : "/login");
  }

  const templates = await getBusinessChecklist(business.id);

  return (
    <>
      <AppHeader
        title="התאמת דרישות רגולטוריות"
        subtitle={business.name}
        demo={demo}
        isAdmin={profile?.is_admin}
      />
      <div className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6">
        <BusinessTabs />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            אילו אישורים נדרשים לעסק שלך?
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            עסק טייק־אווי לא צריך היתר ישיבה בחוץ, ומטבח ללא טיגון לא צריך בדיקת מנדף.
            כיבוי דרישה מונע התראות מיותרות.
          </p>
        </div>

        <TemplateChecklist businessId={business.id} templates={templates} />
      </div>
    </>
  );
}
