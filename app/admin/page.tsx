import { Briefcase, Building2, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminTables } from "@/components/admin/AdminTables";
import { AppHeader } from "@/components/layout/AppHeader";
import { getAdminOverview } from "@/lib/admin";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const demo = isDemoMode();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!demo && !profile.is_admin) {
    redirect(profile.role === "partner" ? "/partner" : "/business");
  }

  const overview = await getAdminOverview();

  return (
    <>
      <AppHeader title="ניהול מערכת" subtitle={profile.full_name ?? undefined} demo={demo} />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">ניהול מערכת</h1>
          <p className="mt-1 text-sm text-gray-500">
            תמונת מצב של כל החשבונות והעסקים בפלטפורמה.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="משתמשים" value={overview.users.length} icon={Users} />
          <StatCard label="בתי עסק" value={overview.businesses.length} icon={Building2} />
          <StatCard label="משרדי ייעוץ" value={overview.partnerCount} icon={Briefcase} />
        </section>

        <AdminTables users={overview.users} businesses={overview.businesses} />
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold leading-none tracking-tight text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
