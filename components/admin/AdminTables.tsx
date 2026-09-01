"use client";

import { Building2, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminBusinessRow, AdminUserRow } from "@/lib/types";

type Tab = "users" | "businesses";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "users", label: "משתמשים", icon: Users },
  { id: "businesses", label: "עסקים", icon: Building2 },
];

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("he-IL");
}

function matches(needle: string, fields: (string | null)[]): boolean {
  if (needle.length === 0) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

export function AdminTables({
  users,
  businesses,
}: {
  users: AdminUserRow[];
  businesses: AdminBusinessRow[];
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();

  const visibleUsers = useMemo(
    () => users.filter((row) => matches(needle, [row.email, row.full_name, row.partner_name])),
    [users, needle],
  );

  const visibleBusinesses = useMemo(
    () =>
      businesses.filter((row) =>
        matches(needle, [row.name, row.hp_number, row.address, row.owner_name, row.owner_email]),
      ),
    [businesses, needle],
  );

  const count = tab === "users" ? visibleUsers.length : visibleBusinesses.length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <nav aria-label="ניווט טבלאות הניהול" className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "true" : undefined}
              className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם, דוא״ל או כתובת"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {count === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-500">
          {needle ? "לא נמצאו תוצאות לחיפוש." : "אין עדיין נתונים להצגה."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          {tab === "users" ? (
            <table className="w-full text-start text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <Th>שם</Th>
                  <Th>דוא״ל</Th>
                  <Th>סוג חשבון</Th>
                  <Th>משרד מקושר</Th>
                  <Th>נרשם</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleUsers.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50">
                    <Td>
                      <span className="font-medium text-gray-900">{row.full_name || "—"}</span>
                      {row.is_admin ? (
                        <span className="ms-2 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          מנהל מערכת
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <span dir="ltr" className="text-gray-600">
                        {row.email || "—"}
                      </span>
                    </Td>
                    <Td>
                      <RoleBadge role={row.role} />
                    </Td>
                    <Td>{row.partner_name || "—"}</Td>
                    <Td>{formatDate(row.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-start text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <Th>שם העסק</Th>
                  <Th>ח.פ / ע.מ</Th>
                  <Th>כתובת</Th>
                  <Th>בעלים</Th>
                  <Th>משרד מקושר</Th>
                  <Th>נוצר</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleBusinesses.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50">
                    <Td>
                      <span className="font-medium text-gray-900">{row.name}</span>
                    </Td>
                    <Td>
                      <span dir="ltr">{row.hp_number || "—"}</span>
                    </Td>
                    <Td>{row.address || "—"}</Td>
                    <Td>
                      <span className="block text-gray-900">{row.owner_name || "—"}</span>
                      {row.owner_email ? (
                        <span dir="ltr" className="block text-xs text-gray-500">
                          {row.owner_email}
                        </span>
                      ) : null}
                    </Td>
                    <Td>{row.partner_name || "—"}</Td>
                    <Td>{formatDate(row.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-2.5 text-start font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-gray-700">{children}</td>;
}

function RoleBadge({ role }: { role: "business" | "partner" }) {
  const partner = role === "partner";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        partner ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-700"
      }`}
    >
      {partner ? "שותף" : "בית עסק"}
    </span>
  );
}
