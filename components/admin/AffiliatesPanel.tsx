"use client";

import { ChevronDown, Coins, Loader2, Users2 } from "lucide-react";
import { useState } from "react";
import { updateBusinessBilling } from "@/app/actions/admin";
import { Toast, type ToastTone } from "@/components/ui/Toast";
import { formatShekels, monthlyCommission, totalCommission } from "@/lib/commission";
import type { AdminPartner, AdminReferral } from "@/lib/types";

export function AffiliatesPanel({ partners }: { partners: AdminPartner[] }) {
  // Terms are edited here rather than re-fetched, so a save updates both the
  // row and the partner total without a round trip through the page.
  const [terms, setTerms] = useState<Record<string, AdminReferral>>(() =>
    Object.fromEntries(
      partners.flatMap((partner) => partner.referrals.map((row) => [row.business_id, row])),
    ),
  );
  const [openId, setOpenId] = useState<string | null>(partners[0]?.id ?? null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  function referralsOf(partner: AdminPartner): AdminReferral[] {
    return partner.referrals.map((row) => terms[row.business_id] ?? row);
  }

  const platformTotal = totalCommission(partners.flatMap(referralsOf));

  if (partners.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-card">
        <p className="text-sm text-gray-500">עדיין אין משרדי ייעוץ רשומים במערכת.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Coins className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-gray-500">סה״כ עמלות לתשלום החודש</p>
          <p className="mt-0.5 text-2xl font-semibold leading-none tracking-tight text-gray-900">
            {formatShekels(platformTotal)}
          </p>
        </div>
      </div>

      {partners.map((partner) => {
        const referrals = referralsOf(partner);
        const open = openId === partner.id;

        return (
          <section
            key={partner.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : partner.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-gray-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users2 className="h-[18px] w-[18px]" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">
                  {partner.name}
                </span>
                <span className="block truncate text-xs text-gray-500">
                  {referrals.length} עסקים מופנים
                  {partner.contact_email ? ` · ${partner.contact_email}` : ""}
                </span>
              </span>

              <span className="text-end">
                <span className="block text-xs text-gray-500">עמלה חודשית</span>
                <span className="block text-base font-semibold tracking-tight text-gray-900">
                  {formatShekels(totalCommission(referrals))}
                </span>
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open ? (
              referrals.length === 0 ? (
                <p className="border-t border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  המשרד עדיין לא הפנה עסקים.
                </p>
              ) : (
                <div className="overflow-x-auto border-t border-gray-200">
                  <table className="w-full text-start text-sm">
                    <thead className="border-b border-gray-200 text-xs text-gray-500">
                      <tr>
                        <th className="px-4 py-2.5 text-start font-medium">עסק</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-medium">
                          מחיר מנוי (₪)
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-medium">
                          אחוז עמלה לעסק זה (%)
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-start font-medium">
                          עמלה חודשית (₪)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {referrals.map((row) => (
                        <ReferralRow
                          key={row.business_id}
                          row={row}
                          onSaved={(saved) =>
                            setTerms((current) => ({ ...current, [row.business_id]: saved }))
                          }
                          onNotify={setToast}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </section>
        );
      })}

      <Toast message={toast?.message ?? null} tone={toast?.tone} onDismiss={() => setToast(null)} />
    </div>
  );
}

function ReferralRow({
  row,
  onSaved,
  onNotify,
}: {
  row: AdminReferral;
  onSaved: (row: AdminReferral) => void;
  onNotify: (toast: { message: string; tone: ToastTone }) => void;
}) {
  const [price, setPrice] = useState(String(row.subscription_price));
  const [rate, setRate] = useState(String(row.partner_commission_rate));
  const [saving, setSaving] = useState(false);

  const parsedPrice = Number(price);
  const parsedRate = Number(rate);
  const valid =
    price.trim() !== "" &&
    rate.trim() !== "" &&
    Number.isFinite(parsedPrice) &&
    Number.isFinite(parsedRate) &&
    parsedPrice >= 0 &&
    parsedRate >= 0 &&
    parsedRate <= 100;

  const preview = valid ? monthlyCommission(parsedPrice, parsedRate) : row.monthly_commission;
  const changed =
    parsedPrice !== row.subscription_price || parsedRate !== row.partner_commission_rate;

  async function commit() {
    if (!changed) return;

    if (!valid) {
      setPrice(String(row.subscription_price));
      setRate(String(row.partner_commission_rate));
      onNotify({ message: "ערך לא תקין. אחוז העמלה חייב להיות בין 0 ל-100.", tone: "error" });
      return;
    }

    setSaving(true);
    try {
      const saved = await updateBusinessBilling(row.business_id, {
        subscription_price: parsedPrice,
        partner_commission_rate: parsedRate,
      });
      setPrice(String(saved.subscription_price));
      setRate(String(saved.partner_commission_rate));
      onSaved({ ...row, ...saved });
      onNotify({ message: `תנאי החיוב של ${row.name} נשמרו`, tone: "success" });
    } catch (error) {
      setPrice(String(row.subscription_price));
      setRate(String(row.partner_commission_rate));
      onNotify({
        message: error instanceof Error ? error.message : "שמירת תנאי החיוב נכשלה",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-4 py-3 align-middle">
        <span className="block font-medium text-gray-900">{row.name}</span>
        <span className="block text-xs text-gray-500">{row.owner_name || row.owner_email || "—"}</span>
      </td>

      <td className="px-4 py-3 align-middle">
        <NumberInput
          value={price}
          onChange={setPrice}
          onCommit={commit}
          disabled={saving}
          ariaLabel={`מחיר מנוי עבור ${row.name}`}
          step="10"
        />
      </td>

      <td className="px-4 py-3 align-middle">
        <NumberInput
          value={rate}
          onChange={setRate}
          onCommit={commit}
          disabled={saving}
          ariaLabel={`אחוז עמלה עבור ${row.name}`}
          step="0.5"
          max="100"
        />
      </td>

      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> : null}
          {formatShekels(preview)}
        </span>
        {changed && !saving ? (
          <span className="block text-[11px] text-amber-600">לא נשמר</span>
        ) : null}
      </td>
    </tr>
  );
}

function NumberInput({
  value,
  onChange,
  onCommit,
  disabled,
  ariaLabel,
  step,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  disabled?: boolean;
  ariaLabel: string;
  step?: string;
  max?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      dir="ltr"
      min="0"
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="h-9 w-24 rounded-lg border border-gray-200 bg-white px-2.5 text-start text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}
