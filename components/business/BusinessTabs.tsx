"use client";

import { LayoutGrid, SlidersHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/business", label: "לוח בקרה", icon: LayoutGrid },
  { href: "/business/profile", label: "פרטי העסק", icon: UserRound },
  { href: "/business/settings", label: "דרישות רגולטוריות", icon: SlidersHorizontal },
];

export function BusinessTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ניווט אזור העסק"
      className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-card"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
