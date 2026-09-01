import { FileSignature } from "lucide-react";
import { redirect } from "next/navigation";
import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import { BusinessTabs } from "@/components/business/BusinessTabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { toProfileInput } from "@/lib/business-profile";
import { getCurrentBusiness, getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export default async function BusinessProfilePage() {
  const demo = isDemoMode();
  const [profile, business] = await Promise.all([getCurrentProfile(), getCurrentBusiness()]);

  if (!demo && profile?.role === "partner") {
    redirect("/partner");
  }

  if (!business) {
    redirect(demo ? "/business" : "/login");
  }

  return (
    <>
      <AppHeader title="פרטי העסק" subtitle={business.name} demo={demo} isAdmin={profile?.is_admin} />
      <div className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6">
        <BusinessTabs />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">פרטי העסק</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            הפרטים האלה נשמרים פעם אחת ומשמשים למילוי אוטומטי של טפסים רשמיים,
            כך שלא צריך למלא אותם מחדש בכל חידוש.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p className="text-xs leading-relaxed text-brand-900">
            לאחר השמירה תוכלו ליצור טפסים ממולאים מלוח הבקרה: תצהיר בטיחות אש, תצהיר
            נגישות ונספח הנתונים של המשטרה. כל טופס לוקח מכאן את השדות שלו.
          </p>
        </div>

        <BusinessProfileForm initialValues={toProfileInput(business)} />
      </div>
    </>
  );
}
