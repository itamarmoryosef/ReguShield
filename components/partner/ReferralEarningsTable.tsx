import { formatShekels } from "@/lib/commission";
import type { PartnerReferral } from "@/lib/types";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("he-IL");
}

export function ReferralEarningsTable({ referrals }: { referrals: PartnerReferral[] }) {
  if (referrals.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-card">
        <p className="text-sm font-medium text-gray-900">עדיין לא הפניתם לקוחות</p>
        <p className="mt-1 text-sm text-gray-500">
          הזמינו בית עסק מלוח הבקרה, וכשהוא יעבור למנוי בתשלום העמלה תופיע כאן.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      {/* Cards on phones, table from md up — five numeric columns do not fit a
          narrow screen without horizontal scrolling. */}
      <ul className="divide-y divide-gray-100 md:hidden">
        {referrals.map((row) => (
          <li key={row.business_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{row.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  הצטרף ב-{formatDate(row.created_at)}
                </p>
              </div>
              <p className="whitespace-nowrap font-semibold text-gray-900">
                {formatShekels(row.monthly_commission)}
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              מנוי {formatShekels(row.subscription_price)} · עמלה {row.partner_commission_rate}%
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-gray-200 text-xs text-gray-500">
            <tr>
              <Th>לקוח</Th>
              <Th>ח.פ / ע.מ</Th>
              <Th>הצטרף</Th>
              <Th>מחיר מנוי</Th>
              <Th>אחוז עמלה</Th>
              <Th>צפי עמלה חודשית (₪)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {referrals.map((row) => (
              <tr key={row.business_id} className="transition-colors hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-700">
                  <span dir="ltr">{row.hp_number || "—"}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatDate(row.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatShekels(row.subscription_price)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {row.partner_commission_rate}%
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                  {formatShekels(row.monthly_commission)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-2.5 text-start font-medium">{children}</th>;
}
