import type { LicensingItem } from "@/lib/types";

export type PlanId = "basic" | "pro";

export type OnboardingData = {
  email: string;
  password: string;
  name: string;
  hp_number: string;
  address: string;
  owner_name: string;
  phone: string;
  serial_number: string;
  business_description: string;
  total_area: string;
  built_area: string;
  licensing_item: LicensingItem;
  max_capacity: string;
  sells_alcohol: boolean;
  templateIds: string[];
  planId: PlanId;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardHolder: string;
};

export type FieldErrors = Partial<Record<keyof OnboardingData, string>>;

export type StepProps = {
  data: OnboardingData;
  errors: FieldErrors;
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  disabled?: boolean;
};
