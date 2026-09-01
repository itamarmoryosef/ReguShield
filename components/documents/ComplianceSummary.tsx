import type { DashboardDocument, DocumentStatus } from "@/lib/types";
import { STATUS_DOT_STYLES } from "./StatusBadge";

type ComplianceSummaryProps = {
  documents: DashboardDocument[];
};

const TILES: { label: string; status: DocumentStatus }[] = [
  { label: "חסרים", status: "missing" },
  { label: "פגי תוקף", status: "expired" },
  { label: "פג תוקף בקרוב", status: "expiring_soon" },
  { label: "בתוקף", status: "valid" },
];

export function ComplianceSummary({ documents }: ComplianceSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map((tile) => {
        const value = documents.filter((doc) => doc.status === tile.status).length;
        return (
          <div
            key={tile.status}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card"
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT_STYLES[tile.status]}`} />
              <p className="text-xs font-medium text-gray-500">{tile.label}</p>
            </div>
            <p className="mt-1.5 text-2xl font-semibold leading-none tracking-tight text-gray-900">
              {value}
            </p>
          </div>
        );
      })}
    </section>
  );
}
