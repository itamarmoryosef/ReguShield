import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { BusinessPortfolioTable } from "@/components/partner/BusinessPortfolioTable";
import { InviteBusinessButton } from "@/components/partner/InviteBusinessButton";
import { PartnerTabs } from "@/components/partner/PartnerTabs";
import { getCurrentPartner, getCurrentProfile, getPartnerPortfolio } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export default async function PartnerPage() {
  const demo = isDemoMode();
  const [profile, partner] = await Promise.all([getCurrentProfile(), getCurrentPartner()]);

  if (!demo && profile?.role === "business") {
    redirect("/business");
  }

  if (!partner) {
    redirect(demo ? "/partner" : "/login");
  }

  const businesses = await getPartnerPortfolio(partner.id);
  const totals = businesses.reduce(
    (acc, row) => {
      acc.expired += row.expired_count;
      acc.missing += row.missing_count;
      acc.expiring += row.expiring_soon_count;
      acc.valid += row.valid_count;
      return acc;
    },
    { expired: 0, missing: 0, expiring: 0, valid: 0 },
  );

  return (
    <>
      <AppHeader
        title="לוח בקרה לשותף"
        subtitle={partner.name}
        demo={demo}
        isAdmin={profile?.is_admin}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <PartnerTabs />
        <div className="space-y-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{partner.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                מבט מהיר על כל בתי העסק תחת המשרד — מה בתוקף ומה דורש טיפול.
              </p>
            </div>
            <InviteBusinessButton />
          </header>

          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryTile label="בתי עסק" value={businesses.length} dotClassName="bg-brand-500" />
            <SummaryTile label="פגי תוקף" value={totals.expired} dotClassName="bg-red-500" />
            <SummaryTile label="חסרים" value={totals.missing} dotClassName="bg-red-500" />
            <SummaryTile label="בתוקף" value={totals.valid} dotClassName="bg-emerald-500" />
          </section>

          <BusinessPortfolioTable businesses={businesses} />
        </div>
      </div>
    </>
  );
}

function SummaryTile({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: number;
  dotClassName: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-semibold leading-none tracking-tight text-gray-900">
        {value}
      </p>
    </div>
  );
}
