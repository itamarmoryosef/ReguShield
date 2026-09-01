"use client";

import { Building2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { BusinessComplianceSummary } from "@/lib/types";

type BusinessPortfolioTableProps = {
  businesses: BusinessComplianceSummary[];
};

export function BusinessPortfolioTable({ businesses }: BusinessPortfolioTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return businesses;
    return businesses.filter((b) => [b.name, b.hp_number, b.address].some((v) => v?.includes(q)));
  }, [businesses, query]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, ח.פ. או כתובת"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pe-10 ps-3 text-sm shadow-card outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        />
      </label>

      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <article
            key={row.business_id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-900">{row.name}</h3>
                <p className="text-xs text-gray-500">{row.address ?? "אין כתובת"}</p>
                <p className="text-xs text-gray-500">
                  ח.פ. {row.hp_number ?? "—"} · {row.required_count} דרישות פעילות
                </p>
              </div>
            </div>
            <StatusLine row={row} />
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card md:block">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">בית עסק</th>
              <th className="px-4 py-3 font-medium">ח.פ.</th>
              <th className="px-4 py-3 font-medium">כתובת</th>
              <th className="px-4 py-3 font-medium">דרישות</th>
              <th className="px-4 py-3 font-medium">סיכום רמזור</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <tr key={row.business_id} className="transition-colors hover:bg-gray-50/70">
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-500">{row.hp_number ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{row.address ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{row.required_count}</td>
                <td className="px-4 py-3">
                  <StatusLine row={row} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-sm text-gray-500">
          אין בתי עסק תואמים לחיפוש.
        </p>
      ) : null}
    </div>
  );
}

function StatusLine({
  row,
  compact,
}: {
  row: BusinessComplianceSummary;
  compact?: boolean;
}) {
  const chips = [
    { label: "פגי תוקף", value: row.expired_count, className: "bg-red-600 text-white" },
    { label: "חסרים", value: row.missing_count, className: "bg-red-600 text-white" },
    { label: "בקרוב", value: row.expiring_soon_count, className: "bg-amber-500 text-white" },
    { label: "בתוקף", value: row.valid_count, className: "bg-emerald-600 text-white" },
  ].filter((chip) => chip.value > 0);

  if (chips.length === 0) {
    return (
      <span className={`text-xs text-gray-400 ${compact ? "" : "mt-3 block"}`}>
        אין דרישות פעילות
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-3"}`}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}
        >
          {chip.value} {chip.label}
        </span>
      ))}
    </div>
  );
}
