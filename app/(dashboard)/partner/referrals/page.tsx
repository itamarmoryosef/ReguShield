import { Coins, TrendingUp, Users2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PartnerTabs } from "@/components/partner/PartnerTabs";
import { ReferralEarningsTable } from "@/components/partner/ReferralEarningsTable";
import { formatShekels, totalCommission } from "@/lib/commission";
import { getCurrentPartner, getCurrentProfile, getPartnerReferrals } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

// Earnings are per partner and change the moment an admin edits the terms.
export const dynamic = "force-dynamic";

export default async function PartnerReferralsPage() {
  const demo = isDemoMode();
  const [profile, partner] = await Promise.all([getCurrentProfile(), getCurrentPartner()]);

  if (!demo && profile?.role !== "partner") {
    redirect("/business");
  }

  if (!partner) {
    redirect(demo ? "/partner" : "/login");
  }

  const referrals = await getPartnerReferrals(partner.id);
  const monthlyTotal = totalCommission(referrals);
  const paying = referrals.filter((row) => row.subscription_price > 0).length;

  return (
    <>
      <AppHeader
        title="הפניות ועמלות"
        subtitle={partner.name}
        demo={demo}
        isAdmin={profile?.is_admin}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <PartnerTabs />

        <div className="space-y-8">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">הפניות ועמלות</h1>
            <p className="mt-1 text-sm text-gray-500">
              העמלה מחושבת לפי המנוי שכל לקוח משלם בפועל ואחוז העמלה שנקבע עבורו.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="סה״כ עמלות צפויות החודש"
              value={formatShekels(monthlyTotal)}
              icon={Coins}
              highlight
            />
            <StatCard label="לקוחות שהופנו" value={String(referrals.length)} icon={Users2} />
            <StatCard label="מתוכם במנוי פעיל" value={String(paying)} icon={TrendingUp} />
          </section>

          <ReferralEarningsTable referrals={referrals} />
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: typeof Coins;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-card">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          highlight ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold leading-none tracking-tight text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
