import { redirect } from "next/navigation";
import { BusinessTabs } from "@/components/business/BusinessTabs";
import { BusinessDashboard } from "@/components/documents/BusinessDashboard";
import { AppHeader } from "@/components/layout/AppHeader";
import {
  getBusinessDashboardDocuments,
  getCurrentBusiness,
  getCurrentProfile,
  getTemplates,
} from "@/lib/data";
import { isProfileComplete } from "@/lib/business-profile";
import { isDemoMode } from "@/lib/env";
import {
  applyPoliceRouting,
  POLICE_GENERATOR_KEY,
  resolvePoliceRequirement,
} from "@/lib/police";

/**
 * Server actions run in this segment, and the document scanner waits on GPT-4o
 * Vision, which regularly takes half a minute on a photographed certificate.
 */
export const maxDuration = 120;

export default async function BusinessPage() {
  const demo = isDemoMode();
  const [profile, business] = await Promise.all([getCurrentProfile(), getCurrentBusiness()]);

  if (!demo && profile?.role === "partner") {
    redirect("/partner");
  }

  if (!business) {
    redirect(demo ? "/business" : "/login");
  }

  const [activeDocuments, catalog] = await Promise.all([
    getBusinessDashboardDocuments(business.id),
    getTemplates(),
  ]);

  // The police requirement follows the licensing item, the capacity and the
  // alcohol answer rather than the checklist the business ticked.
  const police = resolvePoliceRequirement(business);
  const documents = applyPoliceRouting({
    documents: activeDocuments,
    catalog,
    requirement: police,
  });

  const policeTemplate = catalog.find((item) => item.generator_key === POLICE_GENERATOR_KEY);
  const warnings =
    police.status === "required" && police.warning && policeTemplate
      ? { [policeTemplate.id]: police.warning }
      : {};

  const profileComplete = isProfileComplete(business);

  return (
    <>
      <AppHeader
        title="לוח בקרה לעסק"
        subtitle={business.name}
        demo={demo}
        isAdmin={profile?.is_admin}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <BusinessTabs />
        <BusinessDashboard
          businessId={business.id}
          businessName={business.name}
          documents={documents}
          totalTemplates={catalog.length}
          profileComplete={profileComplete}
          warnings={warnings}
          exemptionNotice={police.status === "exempt" ? police.message : null}
        />
      </div>
    </>
  );
}
