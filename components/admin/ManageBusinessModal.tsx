"use client";

import { Coins, ExternalLink, Handshake, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { assignBusinessPartner, updateBusinessBilling } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { Toast, type ToastTone } from "@/components/ui/Toast";
import { formatShekels, monthlyCommission } from "@/lib/commission";
import type { AdminBusinessRow, PartnerOption } from "@/lib/types";

const NO_PARTNER = "";

export function ManageBusinessModal({
  business,
  partners,
  onClose,
  onSaved,
}: {
  business: AdminBusinessRow;
  partners: PartnerOption[];
  onClose: () => void;
  onSaved: (row: AdminBusinessRow) => void;
}) {
  const [price, setPrice] = useState(String(business.subscription_price));
  const [rate, setRate] = useState(String(business.partner_commission_rate));
  const [partnerId, setPartnerId] = useState(business.partner_id ?? NO_PARTNER);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  const parsedPrice = Number(price);
  const parsedRate = Number(rate);
  const billingValid =
    price.trim() !== "" &&
    rate.trim() !== "" &&
    Number.isFinite(parsedPrice) &&
    Number.isFinite(parsedRate) &&
    parsedPrice >= 0 &&
    parsedRate >= 0 &&
    parsedRate <= 100;

  const billingChanged =
    parsedPrice !== business.subscription_price || parsedRate !== business.partner_commission_rate;
  const partnerChanged = (partnerId || null) !== business.partner_id;

  const preview = billingValid
    ? monthlyCommission(parsedPrice, parsedRate)
    : business.monthly_commission;

  async function saveBilling() {
    if (!billingValid) {
      setToast({ message: "אחוז העמלה חייב להיות בין 0 ל-100.", tone: "error" });
      return;
    }

    setSavingBilling(true);
    try {
      const saved = await updateBusinessBilling(business.id, {
        subscription_price: parsedPrice,
        partner_commission_rate: parsedRate,
      });
      setPrice(String(saved.subscription_price));
      setRate(String(saved.partner_commission_rate));
      onSaved({ ...business, ...saved });
      setToast({ message: "תנאי החיוב נשמרו", tone: "success" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "שמירת תנאי החיוב נכשלה",
        tone: "error",
      });
    } finally {
      setSavingBilling(false);
    }
  }

  async function savePartner() {
    setSavingPartner(true);
    try {
      const next = partnerId || null;
      const { partnerName } = await assignBusinessPartner(business.id, next);
      onSaved({ ...business, partner_id: next, partner_name: partnerName });
      setToast({
        message: next ? `העסק שויך ל${partnerName}` : "השיוך למשרד הוסר",
        tone: "success",
      });
    } catch (error) {
      setPartnerId(business.partner_id ?? NO_PARTNER);
      setToast({
        message: error instanceof Error ? error.message : "שיוך המשרד נכשל",
        tone: "error",
      });
    } finally {
      setSavingPartner(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={business.name}
      description={[business.hp_number, business.address].filter(Boolean).join(" · ") || undefined}
      maxWidthClassName="max-w-lg"
    >
      <div className="space-y-6">
        <section>
          <SectionTitle icon={Coins} title="תנאי חיוב ועמלה" />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="מחיר מנוי (₪)"
              type="number"
              inputMode="decimal"
              dir="ltr"
              min="0"
              step="10"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={savingBilling}
            />
            <TextField
              label="אחוז עמלה לעסק זה (%)"
              type="number"
              inputMode="decimal"
              dir="ltr"
              min="0"
              max="100"
              step="0.5"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              disabled={savingBilling}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
            <span className="text-xs font-medium text-gray-600">עמלה חודשית</span>
            <span className="text-sm font-semibold text-gray-900">{formatShekels(preview)}</span>
          </div>

          <Button
            type="button"
            size="md"
            variant="primary"
            className="mt-3 w-full"
            onClick={saveBilling}
            disabled={savingBilling || !billingChanged}
          >
            {savingBilling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingBilling ? "שומר..." : "שמירת תנאי החיוב"}
          </Button>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <SectionTitle icon={Handshake} title="שיוך למשרד ייעוץ" />

          <SelectField
            label="משרד מקושר"
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            disabled={savingPartner}
            options={[
              { value: NO_PARTNER, label: "ללא משרד - לקוח ישיר" },
              ...partners.map((partner) => ({ value: partner.id, label: partner.name })),
            ]}
            hint="העמלה הקיימת תעבור למשרד החדש."
          />

          <Button
            type="button"
            size="md"
            variant="outline"
            className="mt-3 w-full"
            onClick={savePartner}
            disabled={savingPartner || !partnerChanged}
          >
            {savingPartner ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Handshake className="h-4 w-4" />
            )}
            {savingPartner ? "מעדכן..." : "עדכון השיוך"}
          </Button>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <Link
            href={`/admin/businesses/${business.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3 transition-colors hover:bg-gray-50"
          >
            <span>
              <span className="block text-sm font-medium text-gray-900">צפה בתיק הלקוח</span>
              <span className="block text-xs text-gray-500">
                פרטי העסק והמסמכים שהועלו, לקריאה בלבד.
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
          </Link>
        </section>
      </div>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onDismiss={() => setToast(null)} />
    </Modal>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Coins; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-sm font-semibold tracking-tight text-gray-900">{title}</h3>
    </div>
  );
}
